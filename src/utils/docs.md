# Noridoc: utils

Path: @/plugin/src/utils

### Overview

Shared utility functions for the plugin package, currently containing URL normalization helpers to ensure consistent URL formatting across API calls and configuration.

### How it fits into the larger codebase

This folder provides utilities used throughout the plugin package at multiple system boundaries. The normalizeUrl function is used in @/plugin/src/api/base.ts to construct API request URLs (combining organizationUrl from config with endpoint paths like /api/artifacts/create), in @/plugin/src/installer/config.ts to normalize user-provided organizationUrl values before saving to ~/nori-config.json, and is bundled into all paid skills (paid-memorize, paid-recall, paid-\*-noridoc, paid-prompt-analysis) by @/plugin/src/scripts/bundle-skills.ts since they import the API client. The identical implementation exists in @/ui/src/utils/url.ts for the web UI, maintaining consistent URL handling across all client packages.

### Core Implementation

The url.ts module exports a single normalizeUrl function that accepts { baseUrl: string, path?: string | null } and returns a normalized URL. The function strips all trailing slashes from baseUrl using replace(/\/+$/, ''), handles optional path by ensuring it starts with exactly one leading slash, and concatenates them to prevent double slashes. Comprehensive test coverage in url.test.ts validates edge cases including multiple trailing slashes, empty paths, localhost URLs, and query parameters. The function follows the codebase style of named parameters and optional null types.

### Things to Know

URL normalization happens at two critical points: (1) when users provide organizationUrl during installation (installer/config.ts line 137 normalizes before saving to ~/nori-config.json to ensure consistent storage format), and (2) when making API requests (api/base.ts line 105 combines the stored organizationUrl with endpoint paths like /api/artifacts/create). This prevents URL construction bugs from user input variations like "https://example.com/" vs "https://example.com" or paths with/without leading slashes. The utility is bundled into paid skills because esbuild inlines all dependencies when creating standalone executables, so the normalizeUrl code appears in every built skill script. The implementation is duplicated across @/plugin/src/utils/url.ts and @/ui/src/utils/url.ts rather than shared because the packages have different module systems (Node.js vs browser) and build processes.
