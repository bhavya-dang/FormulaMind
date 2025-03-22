/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import "dotenv/config";

type SimilarityMetric = "cosine" | "dot_product" | "euclidean";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_ENDPOINT_URL,
  ASTRA_DB_TOKEN,
} = process.env;

let embeddingPipeline: any;

// Track which URLs have been processed
const processedUrlsFile = "processed_urls.json";
import fs from "fs";

// Existing URLs to scrape
const f1Data = [
  "https://www.formula1.com/",
  "https://www.formula1.com/en/results.html/2024/drivers.html",
  "https://www.formula1.com/en/results.html/2024/constructors.html",
  "https://www.formula1.com/en/results.html/2024/races.html",
  "https://www.formula1.com/en/results.html/2024/fastest-laps.html",
  "https://www.formula1.com/en/results.html/2024/qualifying.html",
  "https://www.formula1.com/en/results.html/2024/sprint.html",
  "https://en.wikipedia.org/wiki/Formula_One",
  "https://en.wikipedia.org/wiki/2025_Formula_One_World_Championship",
  "https://evrimagaci.org/tpg/2025-formula-1-season-kicks-off-with-thrilling-chinese-grand-prix-269074",
  "https://www.formula1.com/en/latest",
  // New URLs to scrape
  "https://www.formula1.com/en/results/2025/drivers",
  "https://www.formula1.com/en/results/2025/constructors",
  "https://www.formula1.com/en/results/2025/races",
  "https://www.formula1.com/en/results/2025/fastest-laps",
  "https://www.formula1.com/en/results/2025/qualifying",
  "https://www.formula1.com/en/results/2025/sprint",
  "https://www.formula1.com/en/results/2025/sprint-qualifying",
  "https://www.formula1.com/en/results/2025/sprint-race",
  "https://www.formula1.com/en/results/2025/sprint-race-results",
  "https://www.formula1.com/en/results/2025/sprint-race-results-by-driver",
  "https://www.formula1.com/en/results/2025/sprint-race-results-by-constructor",
];

const client = new DataAPIClient(ASTRA_DB_TOKEN);

const db = client.db(ASTRA_DB_ENDPOINT_URL, {
  namespace: ASTRA_DB_NAMESPACE,
});

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

// Get previously processed URLs or initialize empty array
const getProcessedUrls = () => {
  try {
    if (fs.existsSync(processedUrlsFile)) {
      return JSON.parse(fs.readFileSync(processedUrlsFile, "utf8"));
    }
  } catch (error) {
    console.error("Error reading processed URLs file:", error);
  }
  return [];
};

// Save processed URLs to file
const saveProcessedUrls = (urls) => {
  try {
    fs.writeFileSync(processedUrlsFile, JSON.stringify(urls, null, 2));
  } catch (error) {
    console.error("Error saving processed URLs:", error);
  }
};

const createCollection = async (
  similarityMetric: SimilarityMetric = "dot_product"
) => {
  // Initialize the embedding pipeline with a sentence transformer model
  const { pipeline } = await import("@xenova/transformers");
  embeddingPipeline = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );

  try {
    const res = await db.createCollection(ASTRA_DB_COLLECTION, {
      vector: {
        dimension: 384, // MiniLM-L6-v2 output dimension
        metric: similarityMetric,
      },
    });
    console.log("Collection created:", res);
  } catch (error) {
    // Collection might already exist, continue anyway
    console.log("Collection might already exist, continuing...", error);
  }
};

const loadData = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION);
  const processedUrls = getProcessedUrls();
  const newlyProcessedUrls = [...processedUrls]; // Copy to track new additions

  // Filter out already processed URLs
  const urlsToProcess = f1Data.filter((url) => !processedUrls.includes(url));

  console.log(`Found ${urlsToProcess.length} new URLs to process`);

  for (const url of urlsToProcess) {
    console.log(`Processing ${url}...`);
    try {
      const content = await scrapePage(url);
      const chunks = await splitter.splitText(content);

      console.log(`Generated ${chunks.length} chunks from ${url}`);

      for (const chunk of chunks) {
        // Generate embeddings using the sentence transformer model
        const output = await embeddingPipeline(chunk, {
          pooling: "mean",
          normalize: true,
        });
        const vector = Array.from(output.data);

        const res = await collection.insertOne({
          $vector: vector,
          text: chunk,
          url: url, // Store source URL for reference
          timestamp: new Date().toISOString(), // Add timestamp for tracking
        });
        console.log(res);
      }

      // Mark URL as processed
      newlyProcessedUrls.push(url);
      saveProcessedUrls(newlyProcessedUrls);
      console.log(`Successfully processed ${url}`);
    } catch (error) {
      console.error(`Error processing ${url}:`, error);
    }
  }
};

const scrapePage = async (url: string) => {
  console.log(`Scraping ${url}...`);
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: true,
    },
    gotoOptions: {
      waitUntil: "domcontentloaded",
      timeout: 60000, // Increase timeout to 60s for slower sites
    },
    evaluate: async (page, browser) => {
      const result = await page.evaluate(() => document.body.innerHTML);
      await browser.close();
      return result;
    },
  });

  return (await loader.scrape())?.replace(/<[^>]*>?/gm, "");
};

console.log("Seeding database...");

createCollection().then(() => loadData());
