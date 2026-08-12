/**
 * Shared skills loader
 */

import * as fs from "fs/promises";
import * as path from "path";

import { copyBundledSkills } from "@/cli/features/bundled-skillsets/installer.js";
import { resetManagedDir } from "@/cli/features/shared/managedDirOps.js";
import { createTemplateWarningCollector } from "@/cli/features/shared/templateWarnings.js";
import { substituteTemplatePaths } from "@/cli/features/template.js";

import type { AgentName } from "@/cli/features/agentNames.js";
import type { AgentLoader } from "@/cli/features/agentRegistry.js";

/**
 * Copy a directory recursively, applying template substitution to markdown files
 *
 * @param args - Copy arguments
 * @param args.src - Source directory path
 * @param args.dest - Destination directory path
 * @param args.agentName - Agent being installed for
 * @param args.commandsDir - Installed slash-commands directory
 * @param args.installDir - Installation directory for template substitution
 * @param args.onWarningFor - Builds a warning sink for a given relative path
 * @param args.skillsDir - Installed skills directory
 */
const copyDirWithTemplateSubstitution = async (args: {
  src: string;
  dest: string;
  agentName: AgentName;
  commandsDir: string;
  installDir: string;
  onWarningFor: (args: {
    relativePath: string;
  }) => (args: { message: string }) => void;
  skillsDir: string;
}): Promise<void> => {
  const {
    src,
    dest,
    agentName,
    commandsDir,
    installDir,
    onWarningFor,
    skillsDir,
  } = args;

  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirWithTemplateSubstitution({
        src: srcPath,
        dest: destPath,
        agentName,
        commandsDir,
        installDir,
        onWarningFor,
        skillsDir,
      });
    } else if (entry.name.endsWith(".md")) {
      // Apply template substitution to markdown files
      const content = await fs.readFile(srcPath, "utf-8");
      const substituted = substituteTemplatePaths({
        agentName,
        content,
        commandsDir,
        installDir,
        onWarning: onWarningFor({
          relativePath: path.relative(skillsDir, destPath),
        }),
        skillsDir,
      });
      await fs.writeFile(destPath, substituted);
    } else {
      // Copy other files directly
      await fs.copyFile(srcPath, destPath);
    }
  }
};

export const skillsLoader: AgentLoader = {
  name: "skills",
  description: "Install skill configuration files",
  managedDirs: ["skills"],
  run: async ({ agent, config, skillset }) => {
    if (skillset == null) {
      return;
    }

    const configDir = skillset.skillsDir;
    const agentDir = agent.getAgentDir({ installDir: config.installDir });
    const destSkillsDir = agent.getSkillsDir({ installDir: config.installDir });
    const destCommandsDir = agent.getSlashcommandsDir({
      installDir: config.installDir,
    });
    const warnings = createTemplateWarningCollector();

    // Reset the destination, preserving any external dotfile entries
    // (e.g. agent-managed `.system/` caches).
    await resetManagedDir({ dir: destSkillsDir });

    // Install inline skills from skillset's skills/ folder
    if (configDir != null) {
      try {
        const entries = await fs.readdir(configDir, { withFileTypes: true });

        for (const entry of entries) {
          const sourcePath = path.join(configDir, entry.name);

          if (!entry.isDirectory()) {
            const destPath = path.join(destSkillsDir, entry.name);
            if (entry.name.endsWith(".md")) {
              const content = await fs.readFile(sourcePath, "utf-8");
              const substituted = substituteTemplatePaths({
                agentName: agent.name,
                content,
                commandsDir: destCommandsDir,
                installDir: agentDir,
                onWarning: warnings.for({ relativePath: entry.name }),
                skillsDir: destSkillsDir,
              });
              await fs.writeFile(destPath, substituted);
            } else {
              await fs.copyFile(sourcePath, destPath);
            }
            continue;
          }

          const destPath = path.join(destSkillsDir, entry.name);
          await copyDirWithTemplateSubstitution({
            src: sourcePath,
            dest: destPath,
            agentName: agent.name,
            commandsDir: destCommandsDir,
            installDir: agentDir,
            onWarningFor: warnings.for,
            skillsDir: destSkillsDir,
          });
        }
      } catch {
        // Profile skills directory not found - continue silently
      }
    }

    // Copy bundled skills (skips any already provided by the skillset)
    await copyBundledSkills({
      agentName: agent.name,
      commandsDir: destCommandsDir,
      destSkillsDir,
      installDir: agentDir,
      onWarningFor: warnings.for,
    });

    warnings.report();
  },
};
