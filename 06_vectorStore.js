import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const INDEX_NAME = process.env.PINECONE_INDEX || "codebase-index";

async function embedText(text, isQuery = false) {
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: [text],
      config: {
        taskType: isQuery ? "CODE_RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
        outputDimensionality: 3072,
      },
    });
    return response.embeddings[0].values;
  } catch (error) {
    console.error("Embedding failed:", error.message);
    throw error;
  }
}

/**
 * STRICT SANITIZATION:
 * 1. Removes null/undefined.
 * 2. Ensures all values are Pinecone-compatible (String, Number, Boolean, Array of Strings).
 */
function sanitizeMetadata(metadata) {
  const clean = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) continue;

    // Pinecone metadata cannot store objects or nested arrays of non-strings
    if (typeof value === "object" && !Array.isArray(value)) continue;

    clean[key] = value;
  }
  return clean;
}

export async function storeChunks(chunks) {
  if (!chunks?.length) return;

  const index = pc.index(INDEX_NAME);
  console.log(`Embedding ${chunks.length} chunks...`);

  const vectors = await Promise.all(
    chunks.map(async chunk => {
      try {
        const values = await embedText(chunk.text, false);

        // Ensure ID is a string and metadata is clean for pinecone validation
        return {
          id: `${chunk.metadata.id}`, // Enforce String Type
          values: values,
          metadata: sanitizeMetadata({
            ...chunk.metadata,
            text: chunk.text,
          }),
        };
      } catch (e) {
        console.error(`Embedding failed for ${chunk.metadata.id}:`, e.message);
        return null;
      }
    }),
  );

  const validVectors = vectors.filter(v => v !== null);
  console.log(`Validated ${validVectors.length} vectors for Pinecone.`);

  // Upsert in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < validVectors.length; i += BATCH_SIZE) {
    const batch = validVectors.slice(i, i + BATCH_SIZE);

    try {
      await index.upsert({
        records: batch,
      });
      console.log(`Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}`);
    } catch (err) {
      console.error("Final Upsert Failure:", err.message);
      // Log one sample record to help debug the exact field causing the fail
      console.log(
        "Sample Record Structure:",
        JSON.stringify(batch[0], null, 2),
      );
      throw err;
    }
  }
}

export async function semanticSearch(query, topK = 10) {
  const index = pc.index(INDEX_NAME);
  const embedding = await embedText(query, true);
  const result = await index.query({
    vector: embedding,
    topK: topK,
    includeMetadata: true,
  });
  return result.matches.map(match => match.metadata);
}

/* sample output of semanticSearch("hello",2)
[
  {
    file: "hello.ts",
    id: "hello.ts#helloTrue",
    language: "typescript",
    parentId: "hello.ts",
    symbol: "helloTrue",
    text: "function helloTrue(name: string): boolean {\n  console.log(\"Hello World!\");\n  return true;\n}",
    type: "function",
  }, {
    file: "hi.py",
    id: "hi.py#module",
    language: "python",
    symbol: "main",
    text: "print(\"Hello World!\")\n",
    type: "module",
  }
]
*/
