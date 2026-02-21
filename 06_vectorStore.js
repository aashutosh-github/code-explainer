import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";

/* ===============================
   Clients
================================ */

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const INDEX_NAME = process.env.PINECONE_INDEX || "codebase-index";
const VECTOR_DIM = 1024;

/* ===============================
   Embedding
================================ */

async function embedText(text) {
  const model = genai.getGenerativeModel({
    model: "gemini-embedding-001",
  });

  const response = await model.embedContent(text);

  let vector = response.embedding.values;

  // Safety fallback → enforce 1024 dims
  if (vector.length > 1024) {
    vector = vector.slice(0, 1024);
  }

  return vector;
}

/* ===============================
   Store Chunks
================================ */

export async function storeChunks(chunks) {
  const index = pc.index(INDEX_NAME);

  const vectors = [];

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.text);

    vectors.push({
      id: chunk.metadata.id,
      values: embedding,
      metadata: {
        ...chunk.metadata,
        text: chunk.text,
      },
    });
  }

  if (vectors.length > 0) {
    await index.upsert({ records: vectors });
  }

  if (vectors.length === 0) {
    console.log("⚠️ No chunks found. Skipping Pinecone upsert.");
    return;
  }
}

/* ===============================
   Semantic Search
================================ */

export async function semanticSearch(query, topK = 10) {
  const index = pc.index(INDEX_NAME);

  const embedding = await embedText(query);

  const result = await index.query({
    vector: embedding,
    topK: topK,
    includeMetadata: true,
  });

  return result.matches.map(match => match.metadata);
}
