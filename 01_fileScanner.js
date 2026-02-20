import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // path.resolve relative to the script location instead of CWD
  const baseEntryPath = path.resolve(__dirname, rootDir);

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
          // Converts absolute path back to a readable relative path
          // relative to where the scan started.
          path: path.relative(baseEntryPath, fullPath),
          content,
          extension: ext,
        });
      }
    }
  }

  walk(baseEntryPath);

  return results;
}
