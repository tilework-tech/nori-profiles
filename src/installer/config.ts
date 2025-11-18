/**
 * Configuration management for Nori Agent Brain MCP installer
 * Functional library for loading and managing disk-based configuration
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import Ajv from 'ajv';

import { normalizeInstallDir } from '@/utils/path.js';
import { normalizeUrl } from '@/utils/url.js';

/**
 * Configuration stored on disk containing authentication credentials and profile selection
 */
export type DiskConfig = {
  auth?: {
    username: string;
    password: string;
    organizationUrl: string;
  } | null;
  profile?: {
    baseProfile: string;
  } | null;
  sendSessionTranscript?: 'enabled' | 'disabled' | null;
  installDirs?: Array<string> | null;
};

/**
 * Runtime configuration derived from disk config
 */
export type Config = {
  installType: 'free' | 'paid';
  nonInteractive?: boolean | null;
  installDir?: string | null;
  auth?: {
    username: string;
    password: string;
    organizationUrl: string;
  } | null;
  profile?: {
    baseProfile: string;
  } | null;
};

/**
 * Get the path to the config file
 * @returns The absolute path to nori-config.json
 */
export const getConfigPath = (): string => {
  return path.join(process.env.HOME || '~', 'nori-config.json');
};

/**
 * Get default profile
 * @returns Default profile (senior-swe)
 */
export const getDefaultProfile = (): { baseProfile: string } => {
  return {
    baseProfile: 'senior-swe',
  };
};

/**
 * Load existing configuration from disk
 * @returns The disk config if valid, null otherwise
 */
export const loadDiskConfig = async (): Promise<DiskConfig | null> => {
  const configPath = getConfigPath();

  try {
    await fs.access(configPath);
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);

    // Validate that the config has the expected structure
    if (config && typeof config === 'object') {
      const result: DiskConfig = {
        auth: null,
        profile: null,
      };

      // Check if auth credentials exist and are valid
      if (
        config.username &&
        config.password &&
        config.organizationUrl &&
        typeof config.username === 'string' &&
        typeof config.password === 'string' &&
        typeof config.organizationUrl === 'string'
      ) {
        result.auth = {
          username: config.username,
          password: config.password,
          organizationUrl: config.organizationUrl,
        };
      }

      // Check if profile exists
      if (config.profile && typeof config.profile === 'object') {
        if (
          config.profile.baseProfile &&
          typeof config.profile.baseProfile === 'string'
        ) {
          result.profile = {
            baseProfile: config.profile.baseProfile,
          };
        }
      }

      // Check if sendSessionTranscript exists, default to 'enabled'
      if (
        config.sendSessionTranscript === 'enabled' ||
        config.sendSessionTranscript === 'disabled'
      ) {
        result.sendSessionTranscript = config.sendSessionTranscript;
      } else {
        result.sendSessionTranscript = 'enabled'; // Default value
      }

      // Handle installDirs with normalization and migration
      if (Array.isArray(config.installDirs)) {
        // Normalize each path
        result.installDirs = config.installDirs.map((dir: string) =>
          normalizeInstallDir({ path: dir }),
        );
      } else if (config.installDirs === null) {
        result.installDirs = null;
      } else {
        // Migration: if installDirs is missing, default to ~/.claude
        result.installDirs = [normalizeInstallDir({ path: '~/.claude' })];
      }

      // Return result if we have at least auth, profile, sendSessionTranscript, or installDirs
      if (
        result.auth != null ||
        result.profile != null ||
        result.sendSessionTranscript != null ||
        result.installDirs != null
      ) {
        return result;
      }
    }
  } catch {
    // File doesn't exist or is invalid
  }

  return null;
};

/**
 * Save authentication credentials and profile to disk
 * @param args - Configuration arguments
 * @param args.username - User's username (null to skip auth)
 * @param args.password - User's password (null to skip auth)
 * @param args.organizationUrl - Organization URL (null to skip auth)
 * @param args.profile - Profile selection (null to skip profile)
 * @param args.sendSessionTranscript - Session transcript setting (null to skip)
 * @param args.installDirs - Install directories (null to skip)
 */
export const saveDiskConfig = async (args: {
  username: string | null;
  password: string | null;
  organizationUrl: string | null;
  profile?: { baseProfile: string } | null;
  sendSessionTranscript?: 'enabled' | 'disabled' | null;
  installDirs?: Array<string> | null;
}): Promise<void> => {
  const {
    username,
    password,
    organizationUrl,
    profile,
    sendSessionTranscript,
    installDirs,
  } = args;
  const configPath = getConfigPath();

  const config: any = {};

  // Add auth credentials if provided
  if (username != null && password != null && organizationUrl != null) {
    // Normalize organization URL to remove trailing slashes
    const normalizedUrl = normalizeUrl({ baseUrl: organizationUrl });

    config.username = username;
    config.password = password;
    config.organizationUrl = normalizedUrl;
  }

  // Add profile if provided
  if (profile != null) {
    config.profile = profile;
  }

  // Add sendSessionTranscript if provided
  if (sendSessionTranscript != null) {
    config.sendSessionTranscript = sendSessionTranscript;
  }

  // Add installDirs if provided, normalizing each path (or save null explicitly)
  if (installDirs !== undefined) {
    if (installDirs === null) {
      config.installDirs = null;
    } else {
      config.installDirs = installDirs.map((dir) =>
        normalizeInstallDir({ path: dir }),
      );
    }
  }

  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
};

/**
 * Generate runtime config from disk config
 * @param args - Configuration arguments
 * @param args.diskConfig - The disk config to convert
 *
 * @returns Runtime configuration
 */
export const generateConfig = (args: {
  diskConfig: DiskConfig | null;
}): Config => {
  const { diskConfig } = args;

  // If we have valid auth credentials, use paid installation
  const installType = diskConfig?.auth ? 'paid' : 'free';

  // Use profile from diskConfig, or default if not present
  const profile = diskConfig?.profile || getDefaultProfile();

  return {
    installType,
    auth: diskConfig?.auth || null,
    profile,
  };
};

/**
 * Validation result type
 */
export type ConfigValidationResult = {
  valid: boolean;
  message: string;
  errors?: Array<string> | null;
};

// JSON schema for nori-config.json
const configSchema = {
  type: 'object',
  properties: {
    username: { type: 'string' },
    password: { type: 'string' },
    organizationUrl: { type: 'string' },
    sendSessionTranscript: {
      type: 'string',
      enum: ['enabled', 'disabled'],
    },
    installDirs: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
    },
  },
  additionalProperties: false,
};

/**
 * Add an install directory to the config's installDirs array
 * @param args - Configuration arguments
 * @param args.installDir - Directory to add
 */
export const addInstallDir = async (args: {
  installDir: string;
}): Promise<void> => {
  const { installDir } = args;
  const normalized = normalizeInstallDir({ path: installDir });

  // Load existing config
  const diskConfig = await loadDiskConfig();
  const existingDirs = diskConfig?.installDirs || [];

  // Deduplicate - only add if not already present
  if (!existingDirs.includes(normalized)) {
    existingDirs.push(normalized);
  }

  // Save back to disk preserving other fields
  await saveDiskConfig({
    username: diskConfig?.auth?.username || null,
    password: diskConfig?.auth?.password || null,
    organizationUrl: diskConfig?.auth?.organizationUrl || null,
    profile: diskConfig?.profile || null,
    sendSessionTranscript: diskConfig?.sendSessionTranscript || null,
    installDirs: existingDirs,
  });
};

/**
 * Remove an install directory from the config's installDirs array
 * @param args - Configuration arguments
 * @param args.installDir - Directory to remove
 */
export const removeInstallDir = async (args: {
  installDir: string;
}): Promise<void> => {
  const { installDir } = args;
  const normalized = normalizeInstallDir({ path: installDir });

  // Load existing config
  const diskConfig = await loadDiskConfig();
  const existingDirs = diskConfig?.installDirs || [];

  // Remove the directory
  const updatedDirs = existingDirs.filter((dir) => dir !== normalized);

  // Save back to disk preserving other fields
  await saveDiskConfig({
    username: diskConfig?.auth?.username || null,
    password: diskConfig?.auth?.password || null,
    organizationUrl: diskConfig?.auth?.organizationUrl || null,
    profile: diskConfig?.profile || null,
    sendSessionTranscript: diskConfig?.sendSessionTranscript || null,
    installDirs: updatedDirs,
  });
};

/**
 * Validate disk configuration
 * @returns Validation result with details
 */
export const validateDiskConfig =
  async (): Promise<ConfigValidationResult> => {
    const configPath = getConfigPath();
    const errors: Array<string> = [];

    // Check if config file exists
    try {
      await fs.access(configPath);
    } catch {
      return {
        valid: false,
        message: 'No nori-config.json found',
        errors: [
          `Config file not found at ${configPath}`,
          'Run "nori-ai install" to create configuration',
        ],
      };
    }

    // Try to load config
    let content: string;
    try {
      content = await fs.readFile(configPath, 'utf-8');
    } catch (err) {
      return {
        valid: false,
        message: 'Unable to read nori-config.json',
        errors: [`Failed to read config file: ${err}`],
      };
    }

    // Try to parse JSON
    let config: any;
    try {
      config = JSON.parse(content);
    } catch (err) {
      return {
        valid: false,
        message: 'Invalid JSON in nori-config.json',
        errors: [`Config file contains invalid JSON: ${err}`],
      };
    }

    // Check if all required fields are present for paid mode
    const hasUsername = config.username && typeof config.username === 'string';
    const hasPassword = config.password && typeof config.password === 'string';
    const hasOrgUrl =
      config.organizationUrl && typeof config.organizationUrl === 'string';

    const credentialsProvided = [hasUsername, hasPassword, hasOrgUrl];
    const someProvided = credentialsProvided.some((v) => v);
    const allProvided = credentialsProvided.every((v) => v);

    // If some credentials are provided but not all, that's an error
    if (someProvided && !allProvided) {
      if (!hasUsername) {
        errors.push(
          'Missing "username" field (required when credentials are provided)',
        );
      }
      if (!hasPassword) {
        errors.push(
          'Missing "password" field (required when credentials are provided)',
        );
      }
      if (!hasOrgUrl) {
        errors.push(
          'Missing "organizationUrl" field (required when credentials are provided)',
        );
      }
      return {
        valid: false,
        message: 'Partial credentials provided - all fields are required',
        errors,
      };
    }

    // If no credentials provided, it's free mode
    if (!someProvided) {
      return {
        valid: true,
        message: 'Config is valid for free mode (no credentials provided)',
        errors: null,
      };
    }

    // All credentials provided - validate with JSON schema
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(configSchema);
    const valid = validate(config);

    // If schema validation failed, collect errors
    if (!valid && validate.errors) {
      errors.push(
        `~/nori-config.json Validation Error: ${JSON.stringify(
          validate.errors,
          null,
          2,
        )}`,
      );
    }

    // Additional URL format validation
    try {
      new URL(config.organizationUrl);
    } catch {
      errors.push(
        `Invalid URL format for organizationUrl: ${config.organizationUrl}`,
      );
    }

    if (errors.length > 0) {
      return {
        valid: false,
        message: 'Config has validation errors',
        errors,
      };
    }

    return {
      valid: true,
      message: 'Config is valid for paid mode',
      errors: null,
    };
  };
