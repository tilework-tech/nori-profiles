/**
 * Environment paths and constants for CLI
 * Contains only CLI-level concerns. Agent-specific paths are in their respective feature directories.
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Find the package root by walking up the directory tree looking for package.json with name "nori-ai"
 * @param args - Function arguments
 * @param args.startDir - Directory to start searching from
 *
 * @returns The package root directory path
 */
const findPackageRoot = (args: { startDir: string }): string => {
  const { startDir } = args;
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf-8"),
        );
        if (packageJson.name === "nori-ai") {
          return currentDir;
        }
      } catch {
        // Continue searching if we can't parse this package.json
      }
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback to relative path from this file if package.json not found
  return path.resolve(startDir, "../../..");
};

/**
 * CLI root directory (where package.json is located)
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const CLI_ROOT = findPackageRoot({ startDir: __dirname });
