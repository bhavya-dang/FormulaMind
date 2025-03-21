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
  // yet to create embeddings for the below pages
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

const createCollection = async (
  similarityMetric: SimilarityMetric = "dot_product"
) => {
  // Initialize the embedding pipeline with a sentence transformer model
  const { pipeline } = await import("@xenova/transformers");
  embeddingPipeline = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );
  const res = await db.createCollection(ASTRA_DB_COLLECTION, {
    vector: {
      dimension: 384, // Changed to match MiniLM-L6-v2 output dimension
      metric: similarityMetric,
    },
  });
  console.log(res);
};

const loadData = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION);

  for (const url of f1Data) {
    const content = await scrapePage(url);
    const chunks = await splitter.splitText(content);

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
      });
      console.log(res);
    }
  }
};

const scrapePage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: true,
    },
    gotoOptions: {
      waitUntil: "domcontentloaded",
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
