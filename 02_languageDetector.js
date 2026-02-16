/**
 * Maps file extensions to language identifiers
 */
const EXTENSION_TO_LANGUAGE = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".java": "java",
  ".go": "go",
  ".cpp": "cpp",
  ".c": "c",
};

/**
 * Adds language field to scanned files
 * @param {Array<{path:string, content:string, extension:string}>} files
 * @returns {Promise<Array<{path:string, content:string, extension:string, language:string}>>}
 */
export async function detectLanguages(files) {
  return files.map(file => ({
    ...file,
    language: EXTENSION_TO_LANGUAGE[file.extension] || "unknown",
  }));
}
