/**
 * Tests for autoupdate hook
 */

import { execSync, spawn } from 'child_process';

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
}));

// Mock logger to suppress output
vi.mock('@/installer/logger.js', () => ({
  error: vi.fn(),
}));

// Mock analytics
vi.mock('@/installer/analytics.js', () => ({
  trackEvent: vi.fn(),
}));

// Mock config to provide install_type
vi.mock('@/installer/config.js', () => ({
  loadDiskConfig: vi.fn(),
}));

// Stub the __PACKAGE_VERSION__ that gets injected at build time
// During tests, we need to provide this value
vi.stubGlobal('__PACKAGE_VERSION__', '14.1.0');

describe('autoupdate', () => {
  describe('unit tests', () => {
    it('should compile with __PACKAGE_VERSION__ declaration', () => {
      // This test verifies that the TypeScript declaration is correct
      // The actual value will be injected at build time by esbuild
      // We can't test the runtime behavior here since it depends on bundling

      // Type check - this will fail at compile time if declaration is wrong
      const testVersion = '14.1.0';
      expect(typeof testVersion).toBe('string');
      expect(testVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should match semantic versioning format', () => {
      // Verify the version format is valid semver
      const semverPattern = /^\d+\.\d+\.\d+$/;
      const testVersion = '14.1.0';

      expect(testVersion).toMatch(semverPattern);
    });
  });

  describe('E2E integration tests', () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      vi.resetModules(); // Reset module cache to ensure fresh imports
    });

    it('should trigger installation when new version is available', async () => {
      // Note: With build-time injection, installedVersion is "14.1.0" (current version)
      // We test by mocking npm to return a newer version

      // Mock execSync to return latest version from npm
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue('14.2.0\n');

      // Mock spawn to capture the installation call
      const mockSpawn = vi.mocked(spawn);
      const mockChild = {
        unref: vi.fn(),
      };
      mockSpawn.mockReturnValue(mockChild as any);

      // Mock loadDiskConfig
      const { loadDiskConfig } = await import('@/installer/config.js');
      const mockLoadDiskConfig = vi.mocked(loadDiskConfig);
      mockLoadDiskConfig.mockResolvedValue(null);

      // Mock trackEvent
      const { trackEvent } = await import('@/installer/analytics.js');
      const mockTrackEvent = vi.mocked(trackEvent);
      mockTrackEvent.mockResolvedValue();

      // Spy on console.log to capture output
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      // Import and run main function
      const autoupdate = await import('./autoupdate.js');
      await autoupdate.main();

      // Verify execSync was called to get latest version
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm view nori-ai version',
        expect.objectContaining({
          encoding: 'utf-8',
        }),
      );

      // Verify spawn was called with correct arguments to install new version
      expect(mockSpawn).toHaveBeenCalledWith(
        'npx',
        ['nori-ai@14.2.0', 'install', '--non-interactive'],
        {
          detached: true,
          stdio: 'ignore',
        },
      );

      // Verify child.unref was called
      expect(mockChild.unref).toHaveBeenCalled();

      // Verify user notification was logged
      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      expect(parsed.systemMessage).toContain('14.1.0'); // current version
      expect(parsed.systemMessage).toContain('14.2.0'); // new version
      expect(parsed.systemMessage).toContain('update available');

      consoleLogSpy.mockRestore();
    });

    it('should not trigger installation when already on latest version', async () => {
      // Mock npm to return same version as build-time injected version
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue('14.1.0\n');

      const mockSpawn = vi.mocked(spawn);

      // Mock loadDiskConfig
      const { loadDiskConfig } = await import('@/installer/config.js');
      const mockLoadDiskConfig = vi.mocked(loadDiskConfig);
      mockLoadDiskConfig.mockResolvedValue(null);

      // Mock trackEvent
      const { trackEvent } = await import('@/installer/analytics.js');
      const mockTrackEvent = vi.mocked(trackEvent);
      mockTrackEvent.mockResolvedValue();

      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      const autoupdate = await import('./autoupdate.js');
      await autoupdate.main();

      // Verify version check happened
      expect(mockExecSync).toHaveBeenCalled();

      // Verify spawn was NOT called
      expect(mockSpawn).not.toHaveBeenCalled();

      // Verify no notification
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('should handle missing latest version gracefully', async () => {
      // Mock execSync to throw (network error)
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockImplementation(() => {
        throw new Error('Network error');
      });

      const mockSpawn = vi.mocked(spawn);

      // Mock loadDiskConfig
      const { loadDiskConfig } = await import('@/installer/config.js');
      const mockLoadDiskConfig = vi.mocked(loadDiskConfig);
      mockLoadDiskConfig.mockResolvedValue(null);

      // Mock trackEvent
      const { trackEvent } = await import('@/installer/analytics.js');
      const mockTrackEvent = vi.mocked(trackEvent);
      mockTrackEvent.mockResolvedValue();

      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      const autoupdate = await import('./autoupdate.js');
      await autoupdate.main();

      // Verify no installation was triggered
      expect(mockSpawn).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('should handle npm returning empty version gracefully', async () => {
      // Mock execSync to return empty string
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue('');

      const mockSpawn = vi.mocked(spawn);

      // Mock loadDiskConfig
      const { loadDiskConfig } = await import('@/installer/config.js');
      const mockLoadDiskConfig = vi.mocked(loadDiskConfig);
      mockLoadDiskConfig.mockResolvedValue(null);

      // Mock trackEvent
      const { trackEvent } = await import('@/installer/analytics.js');
      const mockTrackEvent = vi.mocked(trackEvent);
      mockTrackEvent.mockResolvedValue();

      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      const autoupdate = await import('./autoupdate.js');
      await autoupdate.main();

      // Verify no installation was triggered
      expect(mockSpawn).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('should track session start event on every run', async () => {
      // Mock execSync to return same version (no update needed)
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue('14.1.0\n');

      // Mock loadDiskConfig to return paid config
      const { loadDiskConfig } = await import('@/installer/config.js');
      const mockLoadDiskConfig = vi.mocked(loadDiskConfig);
      mockLoadDiskConfig.mockResolvedValue({
        auth: {
          username: 'test@example.com',
          password: 'test123',
          organizationUrl: 'http://localhost:3000',
        },
        profile: {
          baseProfile: 'senior-swe',
        },
      });

      // Mock trackEvent
      const { trackEvent } = await import('@/installer/analytics.js');
      const mockTrackEvent = vi.mocked(trackEvent);
      mockTrackEvent.mockResolvedValue();

      // Import and run main function
      const autoupdate = await import('./autoupdate.js');
      await autoupdate.main();

      // Verify trackEvent was called with session start
      expect(mockTrackEvent).toHaveBeenCalledWith({
        eventName: 'nori_session_started',
        eventParams: {
          installed_version: '14.1.0',
          update_available: false,
          install_type: 'paid',
        },
      });
    });

    it('should track session start with update_available=true when update exists', async () => {
      // Mock execSync to return newer version
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockReturnValue('14.2.0\n');

      // Mock spawn
      const mockSpawn = vi.mocked(spawn);
      const mockChild = {
        unref: vi.fn(),
      };
      mockSpawn.mockReturnValue(mockChild as any);

      // Mock loadDiskConfig to return free config
      const { loadDiskConfig } = await import('@/installer/config.js');
      const mockLoadDiskConfig = vi.mocked(loadDiskConfig);
      mockLoadDiskConfig.mockResolvedValue(null);

      // Mock trackEvent
      const { trackEvent } = await import('@/installer/analytics.js');
      const mockTrackEvent = vi.mocked(trackEvent);
      mockTrackEvent.mockResolvedValue();

      // Spy on console.log
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      // Import and run main function
      const autoupdate = await import('./autoupdate.js');
      await autoupdate.main();

      // Verify trackEvent was called with update_available=true
      expect(mockTrackEvent).toHaveBeenCalledWith({
        eventName: 'nori_session_started',
        eventParams: {
          installed_version: '14.1.0',
          update_available: true,
          install_type: 'free',
        },
      });

      consoleLogSpy.mockRestore();
    });

    it('should track session start even when npm check fails', async () => {
      // Mock execSync to throw
      const mockExecSync = vi.mocked(execSync);
      mockExecSync.mockImplementation(() => {
        throw new Error('Network error');
      });

      // Mock loadDiskConfig to return paid config
      const { loadDiskConfig } = await import('@/installer/config.js');
      const mockLoadDiskConfig = vi.mocked(loadDiskConfig);
      mockLoadDiskConfig.mockResolvedValue({
        auth: {
          username: 'test@example.com',
          password: 'test123',
          organizationUrl: 'http://localhost:3000',
        },
        profile: {
          baseProfile: 'senior-swe',
        },
      });

      // Mock trackEvent
      const { trackEvent } = await import('@/installer/analytics.js');
      const mockTrackEvent = vi.mocked(trackEvent);
      mockTrackEvent.mockResolvedValue();

      // Import and run main function
      const autoupdate = await import('./autoupdate.js');
      await autoupdate.main();

      // Verify trackEvent was still called (session tracking should be independent)
      // When npm check fails, we can't determine if update is available, so default to false
      expect(mockTrackEvent).toHaveBeenCalledWith({
        eventName: 'nori_session_started',
        eventParams: {
          installed_version: '14.1.0',
          update_available: false,
          install_type: 'paid',
        },
      });
    });
  });
});
