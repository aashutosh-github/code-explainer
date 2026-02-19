import fs from "fs";
import path from "path";

/**
 * Directories to ignore while scanning
 */
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".cache",
]);

/**
 * Supported source code extensions
 */
const SUPPORTED_EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".py",
  ".java",
  ".go",
  ".cpp",
  ".c",
]);

/**
 * Recursively scans a directory and returns valid source files
 * @param {string} rootDir
 * @returns {Array<{ path: string, content: string, extension: string }>}
 */
export function scanCodebase(rootDir) {
  const results = [];
  const newPath = path.resolve(rootDir);

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Skip ignored directories
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          walk(fullPath);
        }
        continue;
      }

      // Process files
      const ext = path.extname(entry.name);
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        const content = fs.readFileSync(fullPath, "utf-8");

        results.push({
          path: fullPath,
          content,
          extension: ext,
        });
      }
    }
  }

  walk(newPath);

  return results;
}
