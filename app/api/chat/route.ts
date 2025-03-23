/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataAPIClient } from "@datastax/astra-db-ts";
import { pipeline } from "@xenova/transformers";
import { NextRequest, NextResponse } from "next/server";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import "dotenv/config";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_ENDPOINT_URL,
  ASTRA_DB_TOKEN,
  AI_API_KEY,
} = process.env;

const client = new DataAPIClient(ASTRA_DB_TOKEN);
const db = client.db(ASTRA_DB_ENDPOINT_URL, {
  namespace: ASTRA_DB_NAMESPACE,
});

// Initialize the embedding pipeline
const embeddingPipeline = await pipeline(
  "feature-extraction",
  "Xenova/all-MiniLM-L6-v2"
);

// Text splitter for web content
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

// Web scraping function
async function scrapePage(url: string) {
  console.log(`Scraping ${url}...`);
  try {
    const loader = new PuppeteerWebBaseLoader(url, {
      launchOptions: {
        headless: true,
      },
      gotoOptions: {
        waitUntil: "domcontentloaded",
        timeout: 60000, // 60s timeout
      },
      evaluate: async (page, browser) => {
        const result = await page.evaluate(() => document.body.innerHTML);
        await browser.close();
        return result;
      },
    });

    return (await loader.scrape())?.replace(/<[^>]*>?/gm, "");
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return "";
  }
}

// Save content to vector database
async function saveToVectorDB(chunks: string[], url: string) {
  const collection = await db.collection(ASTRA_DB_COLLECTION);

  for (const chunk of chunks) {
    try {
      if (!chunk.trim()) continue; // Skip empty chunks

      const output = await embeddingPipeline(chunk, {
        pooling: "mean",
        normalize: true,
      });
      const vector = Array.from(output.data);

      await collection.insertOne({
        $vector: vector,
        text: chunk,
        url: url,
        timestamp: new Date().toISOString(),
        source: "web_fallback",
      });
    } catch (error) {
      console.error("Error saving to vector DB:", error);
    }
  }
}
// FIX WEB CRAWLING
// Function to determine if we should trigger web fallback
function shouldFallbackToWeb(
  docs: any[],
  queryVector: number[],
  similarityThreshold = 0.7
) {
  if (!docs || docs.length === 0) return true;

  // Calculate similarity between query and top result
  if (docs[0].$similarity && docs[0].$similarity < similarityThreshold) {
    return true;
  }

  return false;
}

// Generate search URLs based on query
function generateSearchUrls(query: string) {
  const normalizedQuery = query.toLowerCase();
  const urls = [];

  // Base URLs
  const f1BaseURLs = [
    "https://www.formula1.com/en/results.html",
    "https://en.wikipedia.org/wiki/Formula_One",
    "https://en.wikipedia.org/wiki/2025_Formula_One_World_Championship",
    "https://www.autosport.com/f1/news/",
    "https://en.wikipedia.org/wiki/2026_Formula_One_World_Championship",
  ];

  // Check for common topics
  if (
    normalizedQuery.includes("driver") ||
    normalizedQuery.includes("standings") ||
    normalizedQuery.includes("championship")
  ) {
    urls.push(`${f1BaseURLs[0]}/2025/drivers.html`);
  }

  if (normalizedQuery.includes("2026")) {
    urls.push(
      `https://en.wikipedia.org/wiki/2026_Formula_One_World_Championship`
    );
  }

  if (
    normalizedQuery.includes("team") ||
    normalizedQuery.includes("constructor")
  ) {
    urls.push(`${f1BaseURLs[0]}/2025/constructors.html`);
  }

  if (
    normalizedQuery.includes("race") ||
    normalizedQuery.includes("grand prix") ||
    normalizedQuery.includes("result")
  ) {
    urls.push(`${f1BaseURLs[0]}/2025/races.html`);
  }

  // Add a general wiki page for context
  urls.push(f1BaseURLs[2]);

  // Ensure we have at least one URL and max 2 URLs
  if (urls.length === 0) {
    urls.push(f1BaseURLs[0]);
  }

  return [...new Set(urls)].slice(0, 2); // Deduplicate and limit to 2
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const latestMessages = messages[messages?.length - 1]?.content;

    console.log("Processing query:", latestMessages);
    let docContext: string;
    let usedWebFallback = false;

    // Generate embeddings for the query
    console.log("Generating embeddings...");
    const output = await embeddingPipeline(latestMessages, {
      pooling: "mean",
      normalize: true,
    });
    const vector = Array.from(output.data);

    // Fetch documents from vector DB
    let docs = [];
    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION);
      const results = await collection.find(null, {
        sort: {
          $vector: vector,
        },
        limit: 20,
        includeSimilarity: true,
      });
      docs = await results.toArray();
      // docs.map((doc) => console.log(doc.$similarity));
      console.log("Found relevant documents:", docs?.length);

      // Check if we need to do web fallback
      if (shouldFallbackToWeb(docs, vector)) {
        console.log("Similarity below threshold, falling back to web search");

        // ADD UI TOAST MESSAGE WHEN YOU ARE FALLING BACK TO WEB CRAWLER

        // Get search URLs
        const searchUrls = generateSearchUrls(latestMessages);
        console.log("Generated search URLs:", searchUrls);

        // Scrape and process web content
        for (const url of searchUrls) {
          const content = await scrapePage(url);
          if (content) {
            const chunks = await splitter.splitText(content);
            console.log(`Generated ${chunks.length} chunks from ${url}`);

            // Save chunks to vector DB for future use
            await saveToVectorDB(chunks, url);

            // Add new chunks to our results
            for (const chunk of chunks) {
              docs.push({ text: chunk, url });
            }
          }
        }

        // If we used web fallback, we need to re-rank our documents
        if (docs.length > 20) {
          console.log("Re-ranking documents after web fallback");

          // Calculate similarity scores manually for new chunks
          for (let i = 0; i < docs.length; i++) {
            if (!docs[i].$similarity) {
              // Generate embedding for this chunk
              const chunkOutput = await embeddingPipeline(docs[i].text, {
                pooling: "mean",
                normalize: true,
              });
              const chunkVector = Array.from(chunkOutput.data);

              // Calculate cosine similarity
              let dotProduct = 0;
              let vecAMagnitude = 0;
              let vecBMagnitude = 0;

              for (let j = 0; j < vector.length; j++) {
                dotProduct += vector[j] * chunkVector[j];
                vecAMagnitude += vector[j] * vector[j];
                vecBMagnitude += chunkVector[j] * chunkVector[j];
              }

              vecAMagnitude = Math.sqrt(vecAMagnitude);
              vecBMagnitude = Math.sqrt(vecBMagnitude);

              docs[i].$similarity =
                dotProduct / (vecAMagnitude * vecBMagnitude);
            }
          }

          // Sort by similarity
          docs.sort((a, b) => (b.$similarity || 0) - (a.$similarity || 0));

          // Limit to top 20
          docs = docs.slice(0, 20);
        }

        usedWebFallback = true;
      }

      docContext = JSON.stringify(docs?.map((doc) => doc.text));
    } catch (err) {
      console.error("Error fetching documents:", err);
      docContext = "";
    }

    // Send prompt to Gemini via OpenRouter
    const systemMessage = `You are an AI assistant who knows everything about Formula One. Use the below context to augment what you know about Formula One racing. The context will provide you with the most recent page data from wikipedia, the official F1 website and others.
    If the context doesn't include the information you need answer based on your existing knowledge and don't mention the source of your information or what the context does or doesn't include.
    Format responses using markdown where applicable and don't return images.
    ABSOLUTELY DO NOT MENTION THE SOURCE OF YOUR INFORMATION OR WHAT THE CONTEXT DOES OR DOESN'T INCLUDE.
    IF YOU ARE NOT SURE ABOUT THE ANSWER, SAY YOU DON'T KNOW.
    ABSOLUTELY DO NOT MENTION WHAT THE CONTEXT DOES OR DOESN'T INCLUDE.
    -------------
    START CONTEXT
    ${docContext}
    END CONTEXT
    -------------
    QUESTION ${latestMessages}
    -------------
    `;

    const template = {
      role: "system",
      content: [
        {
          type: "text",
          text: systemMessage,
        },
      ],
    };

    console.log("Starting gemini completion...");
    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          messages: [template, ...messages],
        }),
      }
    );

    const res = await openRouterResponse.json();

    // Add metadata about fallback (for debugging/logging only)
    if (process.env.NODE_ENV === "development") {
      res._debug = {
        usedWebFallback,
        documentCount: docs?.length,
        webCrawled: usedWebFallback,
      };
    }

    return new NextResponse(JSON.stringify(res), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    throw error;
  }
}
