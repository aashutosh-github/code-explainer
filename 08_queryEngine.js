import { semanticSearch } from "./06_vectorStore.js";
import { expandSymbol } from "./07_graphStore.js";

export async function buildContext(query) {
  // 1. Initial semantic search
  const chunks = await semanticSearch(query, 8);

  // 2. Collect symbols
  const symbols = new Set();
  for (const chunk of chunks) {
    if (chunk.symbol) symbols.add(chunk.symbol);
  }

  // 3. Graph expansion
  const relations = [];

  for (const symbol of symbols) {
    const neighbors = await expandSymbol(symbol);
    for (const n of neighbors) {
      relations.push({
        from: symbol,
        to: n.symbol,
        type: n.type,
      });
    }
  }

  return {
    query,
    chunks,
    relations,
  };
}
