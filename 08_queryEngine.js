import { semanticSearch } from "./06_vectorStore.js";
import { expandSymbol } from "./07_graphStore.js";

/**
 * Builds a rich, structured context for the LLM by joining
 * Vector results with Graph lineage.
 */
export async function buildContext(query) {
  const chunks = await semanticSearch(query, 5);

  const enhancedResults = [];
  const globalSeenIds = new Set(); // Prevent token bloat from duplicate context

  for (const chunk of chunks) {
    const { symbol, file, text, type, language, id } = chunk;

    const resultEntry = {
      code: text,
      metadata: { file, symbol, type, language },
      graphContext: [],
    };

    try {
      // Pass both name and filePath to reconstruct the UID (path#symbol)
      const neighbors = await expandSymbol(symbol, file);

      for (const neighbor of neighbors) {
        if (!globalSeenIds.has(neighbor.id)) {
          resultEntry.graphContext.push({
            name: neighbor.name,
            type: neighbor.type,
            id: neighbor.id,
          });
          globalSeenIds.add(neighbor.id);
        }
      }
    } catch (err) {
      console.warn(`Graph expansion skipped for ${id}:`, err.message);
    }

    enhancedResults.push(resultEntry);
  }

  return {
    query,
    context: enhancedResults,
  };
}
