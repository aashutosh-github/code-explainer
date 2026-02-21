import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

import { scanCodebase } from "./01_fileScanner.js";
import { detectLanguages } from "./02_languageDetector.js";
import { parseFilesToAST } from "./03_astParser.js";
import { extractSymbols } from "./04_symbolExtractor.js";
import { buildChunks } from "./05_chunkBuilder.js";
import { storeChunks } from "./06_vectorStore.js";
import { syncChunksToGraph } from "./07_graphStore.js";

/* ===============================
   CLI
================================ */

const rl = readline.createInterface({ input, output });

async function ingest() {
  try {
    console.log("📂 Enter root folder path (relative to this file):");
    const folderPath = await rl.question("> ");

    console.log("\n🔍 Scanning files...");
    const files = await scanCodebase(folderPath);

    console.log("🧠 Detecting languages...");
    const withLang = await detectLanguages(files);

    console.log("🌳 Parsing AST...");
    const withAst = await parseFilesToAST(withLang);

    console.log("🔎 Extracting symbols...");
    const withSymbols = extractSymbols(withAst);

    console.log("📦 Building chunks...");
    const chunks = buildChunks(withSymbols);
    console.log(`🧩 Total chunks created: ${chunks.length}`);

    console.log("📥 Storing chunks in Vector DB...");
    await storeChunks(chunks);

    /* ===============================
       🕸️ BUILDING GRAPH (UPDATED)
    ================================ */
    console.log("🕸️ Syncing chunks to Knowledge Graph...");
    await syncChunksToGraph(chunks);
    console.log("\n✅ Ingestion completed successfully.");
    rl.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Ingestion failed:", err);
    rl.close();
    process.exit(1);
  }
}

ingest();
