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
    /* ===============================
        FILE LEVEL CHUNK (always)
     ================================ */

    chunks.push({
      text: file.content.slice(0, 4000),
      metadata: {
        file: file.path,
        symbol: "FILE",
        type: "file",
        language: file.language,
      },
    });

    // If AST missing, still keep file chunk
    if (!file.ast) continue;

    traverse(file.ast.rootNode, node => {
      /* ===============================
          FUNCTIONS
       ================================ */

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

      /* ===============================
          CLASSES
       ================================ */

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

      // Arrow functions & function expressions
      if (
        node.type === "lexical_declaration" ||
        node.type === "variable_declaration"
      ) {
        for (const child of node.namedChildren) {
          if (child.type !== "variable_declarator") continue;

          const nameNode = child.childForFieldName("name");
          const valueNode = child.childForFieldName("value");

          if (!nameNode || !valueNode) continue;

          if (
            valueNode.type === "arrow_function" ||
            valueNode.type === "function"
          ) {
            const chunkText = extractChunkFromNode(valueNode, file.content);

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
        }
      }
    });
  }

  return chunks;
}
