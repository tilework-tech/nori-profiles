#!/usr/bin/env node

/**
 * List Noridocs script - List all server-side documentation
 *
 * IMPORTANT: This file is BUNDLED during the build process.
 *
 * @see scripts/bundle-skills.ts - Bundler that creates standalone executables
 * @see mcp/src/installer/features/skills/config/paid-recall/script.ts - Full bundling documentation
 */

import minimist from 'minimist';

import { apiClient } from '@/api/index.js';
import { loadDiskConfig, generateConfig } from '@/installer/config.js';

/**
 * Show usage information
 */
const showUsage = (): void => {
  console.error(`Usage: node script.js [--pathPrefix="@/path"] [--limit=100]

Parameters:
  --pathPrefix  (optional) Filter by prefix like "@/server"
  --limit       (optional) Maximum results (default: 100)

Examples:
  # List all noridocs
  node script.js

  # List noridocs under server directory
  node script.js --pathPrefix="@/server"

  # List with custom limit
  node script.js --pathPrefix="@/mcp" --limit=50

Description:
  Lists all noridocs, optionally filtered by path prefix for tree navigation.

  Examples:
  - No prefix: Returns all noridocs
  - Prefix "@/server": Returns all noridocs under server directory
  - Prefix "@/server/src/persistence": Returns all noridocs in persistence folder`);
};

/**
 * Main execution function
 */
export const main = async (): Promise<void> => {
  // 1. Check tier
  const diskConfig = await loadDiskConfig();
  const config = generateConfig({ diskConfig });

  if (config.installType !== 'paid') {
    console.error('Error: This feature requires a paid Nori subscription.');
    console.error('Please configure your credentials in ~/nori-config.json');
    process.exit(1);
  }

  // 2. Parse and validate arguments
  const args = minimist(process.argv.slice(2));

  const pathPrefix = (args.pathPrefix as string | null) ?? null;
  const limit = (args.limit as number | null) ?? 100;

  // Show usage if help requested
  if (args.help || args.h) {
    showUsage();
    process.exit(0);
  }

  // 3. Execute API call
  const noridocs = await apiClient.noridocs.list({ limit });

  const filtered = pathPrefix
    ? noridocs.filter((n) => n.sourceUrl && n.sourceUrl.startsWith(pathPrefix))
    : noridocs;

  // 4. Format and display output
  if (filtered.length === 0) {
    console.log(
      pathPrefix
        ? `No noridocs found with prefix "${pathPrefix}"`
        : 'No noridocs found',
    );
    return;
  }

  const formatted = filtered
    .map(
      (n, i) =>
        `${i + 1}. ${n.sourceUrl}
   Last updated: ${new Date(n.updatedAt).toLocaleString()}`,
    )
    .join('\n\n');

  console.log(`Found ${filtered.length} noridoc(s):\n\n${formatted}`);
};

// Run main function if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: Error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}
