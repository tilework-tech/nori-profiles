#!/usr/bin/env node

/**
 * Hook handler for auto-updating nori-ai package
 *
 * This script is called by Claude Code SessionStart hook.
 * It checks npm registry for updates and installs them in the background.
 */

import { execSync, spawn } from 'child_process';
import { appendFileSync, openSync, closeSync } from 'fs';
import { join } from 'path';

import { trackEvent } from '@/installer/analytics.js';
import { loadDiskConfig } from '@/installer/config.js';
import { error } from '@/installer/logger.js';
import { getInstalledVersion } from '@/installer/version.js';

const PACKAGE_NAME = 'nori-ai';

/**
 * Get the latest version from npm registry
 * @returns The latest version string or null if not found
 */
const getLatestVersion = async (): Promise<string | null> => {
  try {
    const output = execSync(`npm view ${PACKAGE_NAME} version`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.trim();
  } catch {
    return null;
  }
};

/**
 * Spawn install process for a specific directory
 * @param args - Configuration arguments
 * @param args.version - Version to install
 * @param args.installDir - Install directory (null for default)
 * @param args.logPath - Path to log file
 */
const spawnInstall = (args: {
  version: string;
  installDir: string | null;
  logPath: string;
}): void => {
  const { version, installDir, logPath } = args;

  // Build command args
  const commandArgs: Array<string> = [
    `${PACKAGE_NAME}@${version}`,
    'install',
    '--non-interactive',
  ];
  if (installDir != null) {
    commandArgs.push('--install-dir', installDir);
  }

  // Log header
  const dirInfo = installDir != null ? ` to ${installDir}` : '';
  const commandStr = `npx ${commandArgs.join(' ')}`;
  const logHeader = `\n=== Nori Autoupdate: ${new Date().toISOString()} ===\nInstalling v${version}${dirInfo}...\nCommand: ${commandStr}\n`;
  appendFileSync(logPath, logHeader);

  // Open log file descriptor
  const logFd = openSync(logPath, 'a');

  // Spawn background process
  const child = spawn('npx', commandArgs, {
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });

  // Handle spawn errors
  child.on('error', (err) => {
    const errorInfo = installDir != null ? ` for ${installDir}` : '';
    appendFileSync(logPath, `\nSpawn error${errorInfo}: ${err.message}\n`);
    error({ message: `Autoupdate spawn failed${errorInfo}: ${err.message}` });
  });

  // Close file descriptor when process exits
  child.on('exit', () => {
    try {
      closeSync(logFd);
    } catch {
      // Ignore close errors
    }
  });

  child.unref();
};

/**
 * Install the latest version in the background
 * @param args - Configuration arguments
 * @param args.version - Version to install
 */
const installUpdate = async (args: { version: string }): Promise<void> => {
  const { version } = args;

  // Load disk config to get install directories
  const diskConfig = await loadDiskConfig();
  const installDirs =
    diskConfig?.installDirs && diskConfig.installDirs.length > 0
      ? diskConfig.installDirs
      : null;

  const logPath = join(process.env.HOME || '~', '.nori-notifications.log');

  // Spawn install process for each directory (or default)
  if (installDirs) {
    for (const installDir of installDirs) {
      spawnInstall({ version, installDir, logPath });
    }
  } else {
    spawnInstall({ version, installDir: null, logPath });
  }
};

/**
 * Output hook result with additionalContext
 * @param args - Configuration arguments
 * @param args.message - Message to output
 */
const logToClaudeSession = (args: { message: string }): void => {
  const { message } = args;

  const output = {
    systemMessage: message,
  };

  console.log(JSON.stringify(output));
};

/**
 * Main entry point
 */
const main = async (): Promise<void> => {
  try {
    // Get installed version from file (not build constant) to ensure
    // we retry if previous install failed
    const installedVersion = getInstalledVersion();

    // Load disk config to determine install_type
    const diskConfig = await loadDiskConfig();
    const installType = diskConfig?.auth ? 'paid' : 'free';

    // Check for updates
    const latestVersion = await getLatestVersion();
    const updateAvailable =
      latestVersion != null && installedVersion !== latestVersion;

    // Track session start (fire and forget - non-blocking)
    trackEvent({
      eventName: 'nori_session_started',
      eventParams: {
        installed_version: installedVersion,
        update_available: updateAvailable,
        install_type: installType,
      },
    }).catch(() => {
      // Silent failure - never interrupt session startup for analytics
    });

    if (!latestVersion) {
      // Could not determine latest version, skip silently
      return;
    }

    if (installedVersion === latestVersion) {
      // Already on latest version
      return;
    }

    // New version available - install in background
    await installUpdate({ version: latestVersion });

    // Notify user via additionalContext
    logToClaudeSession({
      message: `🔄 Nori Agent Brain update available: v${installedVersion} → v${latestVersion}. Installing in background...`,
    });
  } catch (err) {
    // Silent failure - don't interrupt session startup
    error({
      message: `Nori autoupdate: Error checking for updates (non-fatal): ${err}`,
    });
  }
};

// Export for testing
export { main };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    error({ message: `Nori autoupdate: Unhandled error (non-fatal): ${err}` });
    process.exit(0);
  });
}
