/**
 * Recursively traverse AST
 */
function traverse(node, callback) {
  callback(node);
  for (const child of node.children || []) {
    traverse(child, callback);
  }
}

/**
 * Extract code chunk using node byte range
 */
function extractChunkFromNode(node, content) {
  return content.slice(node.startIndex, node.endIndex);
}

/**
 * Build semantic chunks from AST
 * @param {Array<{path:string, content:string, language:string, ast:any}>} files
 * @returns {Array<{text:string, metadata:Object}>}
 */
export function buildChunks(files) {
  const chunks = [];

  for (const file of files) {
    if (!file.ast) continue;

    traverse(file.ast.rootNode, node => {
      // Function declarations
      if (node.type === "function_declaration") {
        const nameNode = node.childForFieldName("name");
        if (!nameNode) return;

        const chunkText = extractChunkFromNode(node, file.content);

        chunks.push({
          text: chunkText,
          metadata: {
            file: file.path,
            symbol: nameNode.text,
            type: "function",
            language: file.language,
          },
        });
      }

      // Class declarations
      if (node.type === "class_declaration") {
        const nameNode = node.childForFieldName("name");
        if (!nameNode) return;

        const chunkText = extractChunkFromNode(node, file.content);

        chunks.push({
          text: chunkText,
          metadata: {
            file: file.path,
            symbol: nameNode.text,
            type: "class",
            language: file.language,
          },
        });
      }
    });
  }

  return chunks;
}
