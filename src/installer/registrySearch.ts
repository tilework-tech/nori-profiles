/**
 * CLI command for searching profiles in the Nori profile registry
 * Handles: nori-ai registry-search <query>
 * Searches across all configured registries (public + private)
 */

import {
  PROFILE_REGISTRY_URL,
  profileRegistryApi,
  type Profile,
} from "@/api/profileRegistry.js";
import { getRegistryAuthToken } from "@/api/registryAuth.js";
import { loadConfig } from "@/installer/config.js";
import { error, info } from "@/installer/logger.js";
import { normalizeUrl } from "@/utils/url.js";

import type { Command } from "commander";

/**
 * Result from searching a single registry
 */
type RegistrySearchResult = {
  registryUrl: string;
  profiles: Array<Profile>;
  error?: string | null;
};

/**
 * Search across all configured registries
 * @param args - Search parameters
 * @param args.query - The search query string
 * @param args.installDir - The Nori installation directory
 *
 * @returns Array of results per registry
 */
const searchAllRegistries = async (args: {
  query: string;
  installDir: string;
}): Promise<Array<RegistrySearchResult>> => {
  const { query, installDir } = args;
  const results: Array<RegistrySearchResult> = [];

  // Load config to get registry auths
  const config = await loadConfig({ installDir });

  // Normalize public registry URL for comparison
  const normalizedPublicUrl = normalizeUrl({ baseUrl: PROFILE_REGISTRY_URL });

  // Track searched registries to avoid duplicates
  const searchedRegistries = new Set<string>();

  // Always search public registry (no auth required)
  try {
    const profiles = await profileRegistryApi.searchProfilesOnRegistry({
      query,
      registryUrl: PROFILE_REGISTRY_URL,
    });
    results.push({ registryUrl: PROFILE_REGISTRY_URL, profiles });
    searchedRegistries.add(normalizedPublicUrl);
  } catch (err) {
    results.push({
      registryUrl: PROFILE_REGISTRY_URL,
      profiles: [],
      error: err instanceof Error ? err.message : String(err),
    });
    searchedRegistries.add(normalizedPublicUrl);
  }

  // Search private registries if configured
  if (config?.registryAuths != null) {
    for (const registryAuth of config.registryAuths) {
      const normalizedRegistryUrl = normalizeUrl({
        baseUrl: registryAuth.registryUrl,
      });

      // Skip if already searched (e.g., if private registry URL matches public)
      if (searchedRegistries.has(normalizedRegistryUrl)) {
        continue;
      }
      searchedRegistries.add(normalizedRegistryUrl);

      try {
        // Get auth token for this registry
        const authToken = await getRegistryAuthToken({ registryAuth });

        const profiles = await profileRegistryApi.searchProfilesOnRegistry({
          query,
          registryUrl: registryAuth.registryUrl,
          authToken,
        });
        results.push({ registryUrl: registryAuth.registryUrl, profiles });
      } catch (err) {
        results.push({
          registryUrl: registryAuth.registryUrl,
          profiles: [],
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return results;
};

/**
 * Format multi-registry search results for display
 * @param args - The results to format
 * @param args.results - Array of search results from each registry
 *
 * @returns Formatted string
 */
const formatSearchResults = (args: {
  results: Array<RegistrySearchResult>;
}): string => {
  const { results } = args;
  const lines: Array<string> = [];

  for (const result of results) {
    // Show error for failing registries
    if (result.error != null) {
      lines.push(result.registryUrl);
      lines.push(`  -> Error: ${result.error}`);
      lines.push("");
      continue;
    }

    // Skip registries with no results
    if (result.profiles.length === 0) {
      continue;
    }

    lines.push(result.registryUrl);
    for (const profile of result.profiles) {
      const description = profile.description ? `: ${profile.description}` : "";
      lines.push(`  -> ${profile.name}${description}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
};

/**
 * Search for profiles in the registry across all configured registries
 * @param args - The search parameters
 * @param args.query - The search query
 * @param args.installDir - Optional installation directory (detected if not provided)
 */
export const registrySearchMain = async (args: {
  query: string;
  installDir?: string | null;
}): Promise<void> => {
  const { query, installDir } = args;

  // Use provided installDir or default to ~/.claude
  const effectiveInstallDir = installDir ?? `${process.env.HOME ?? ""}/.claude`;

  // Search all registries
  const results = await searchAllRegistries({
    query,
    installDir: effectiveInstallDir,
  });

  // Check if we have any profiles
  const hasProfiles = results.some((r) => r.profiles.length > 0);

  if (!hasProfiles) {
    // Check if all results are errors
    const allErrors = results.every((r) => r.error != null);
    if (allErrors) {
      const formattedResults = formatSearchResults({ results });
      error({
        message: `Failed to search profiles:\n\n${formattedResults}`,
      });
      return;
    }

    info({ message: `No profiles found matching "${query}".` });
    info({
      message:
        "Try a different search term or browse the registry at https://registrar.tilework.tech",
    });
    return;
  }

  const formattedResults = formatSearchResults({ results });

  console.log("");
  console.log(formattedResults);
  console.log("");
  info({
    message:
      "To install a profile, run: nori-ai registry-download <profile-name>",
  });
};

/**
 * Register the 'registry-search' command with commander
 * @param args - Configuration arguments
 * @param args.program - Commander program instance
 */
export const registerRegistrySearchCommand = (args: {
  program: Command;
}): void => {
  const { program } = args;

  program
    .command("registry-search <query>")
    .description("Search for profiles in the Nori profile registry")
    .action(async (query: string) => {
      // Get global options from parent
      const globalOpts = program.opts();
      await registrySearchMain({
        query,
        installDir: globalOpts.installDir || null,
      });
    });
};
