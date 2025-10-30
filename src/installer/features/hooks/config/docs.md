# Noridoc: config

Path: @/plugin/src/installer/features/hooks/config

### Overview

Executable hook scripts for conversation summarization, desktop notifications, and package auto-updates. Contains four hook implementations that Claude Code invokes at lifecycle events: summarize.ts (memorizes conversations to backend), summarize-notification.ts (displays sync user notification), autoupdate.ts (checks and installs package updates), and notify-hook.sh (cross-platform desktop notifications).

### How it fits into the larger codebase

This folder contains the actual hook implementations referenced by @/plugin/src/installer/features/hooks/loader.ts in ~/.claude/settings.json. The hooks are executed by Claude Code at specific lifecycle events. The summarize.ts hook calls @/plugin/src/api/conversation.ts to create conversation artifacts in the backend. The autoupdate.ts hook uses npm to check for and install new versions of the nori-ai package. The notify-hook.sh script provides cross-platform desktop notification support, while summarize-notification.ts displays a quick message to users when transcripts are being saved.

### Core Implementation

TypeScript files are compiled to JavaScript during build and executed directly via `node {script}.js` commands configured in settings.json. No shell script wrappers exist anymore (previously removed in favor of direct TypeScript execution).

**summarize.ts**: Accepts SessionEnd or PreCompact as first argument. Reads conversation data from process.argv[3] or stdin. Parses conversation data JSON to extract transcript_path, reads the full transcript file, and filters empty transcripts using isEmptyTranscript() before calling apiClient.conversation.summarize(). Empty transcript detection checks for user messages with actual content - transcripts containing only metadata (file-history-snapshot, summaries) or only assistant messages are skipped with debug logging. Outputs `{async: true}` on startup to run asynchronously without blocking session end.

**summarize-notification.ts**: Minimal synchronous hook that outputs `{systemMessage: "Saving transcript to nori...\n\n"}` to provide immediate user feedback while summarize.ts runs asynchronously in background.

**autoupdate.ts**: Tracks session starts via Google Analytics and checks for package updates. On every run, loads disk config to determine install_type ('paid' if auth credentials exist, 'free' otherwise), then tracks `nori_session_started` event with metadata: installed_version (from build-time injection), update_available (boolean), and install_type. The tracking call is asynchronous with silent failure to never disrupt session startup. Then compares installed version against latest npm registry version using `npm view nori-ai version`. When update available, spawns detached background process running `npx nori-ai@{version} install --non-interactive` to install update and re-run installer preserving user config. Outputs systemMessage with version upgrade notification.

**notify-hook.sh**: Shell script (only remaining shell script in config/) that reads JSON notification data from stdin. Parses message field using python3/jq/node/sed fallbacks for portability. Platform detection via `uname -s` determines notification method: Linux uses notify-send with click-to-focus actions (X11 only, requires wmctrl/xdotool), macOS tries terminal-notifier with click-to-focus then falls back to osascript (not clickable), Windows tries BurntToast PowerShell module then Windows Forms then msg.exe. Captures terminal window ID on Linux X11 using xdotool before sending notification, then restores focus when user clicks. macOS click-to-focus auto-detects terminal app bundle ID from $TERM_PROGRAM environment variable. All operations logged to ~/.nori-notifications.log for debugging. Gracefully degrades to basic notifications on Wayland or when optional dependencies are missing.

### Things to Know

Hook execution is controlled by @/plugin/src/installer/features/hooks/loader.ts configuration: paid installations install all four hooks (summarize, summarize-notification, autoupdate, notify), free installations only get autoupdate and notify. The summarize-notification hook must be registered before summarize hook in loader.ts to ensure synchronous user notification appears before async background summarization.

All TypeScript hooks use JSON.stringify() to output structured responses: summarize.ts outputs `{async: true}` to run non-blocking, while autoupdate.ts and summarize-notification.ts output `{systemMessage: "..."}` to inject messages into Claude sessions. Error handling is strictly non-fatal - all hooks catch errors, log via error() function, and exit with code 0 to prevent disrupting Claude Code sessions. The summarize.ts hook checks ConfigManager.isConfigured() and skips execution if nori-config.json is missing.

The isEmptyTranscript() function (exported for testing in summarize.test.ts) uses strict content validation: parses newline-delimited JSON transcript, filters for user message types, and checks if message content (string or array with text) contains non-whitespace. Only transcripts with at least one substantive user message are sent to backend. This prevents unnecessary API calls for metadata-only sessions (file-history-snapshot, auto-compaction summaries, assistant-only exchanges).

Historical note: This directory previously contained abilities-context.ts and skills-context.ts hooks for SessionStart ability/skill discovery. Both were removed - abilities-context.ts was renamed to skills-context.ts during superpowers integration (#104), then skills-context.ts was deleted when skill discovery moved to hardcoded CLAUDE.md generation at install time (#120). Shell script wrappers (autoupdate.sh, summarize.sh, summarize-notification.sh) were also removed in favor of direct TypeScript execution via node commands.

### Optional Dependencies for Click-to-Focus Notifications

The notify-hook.sh script sends desktop notifications when Claude needs attention. By default, notifications work on all platforms but may not support click-to-focus behavior without optional dependencies.

**Linux (X11)**

For clickable notifications that return focus to your terminal, install:

**Ubuntu/Debian:**

```bash
sudo apt-get install libnotify-bin wmctrl xdotool
```

**Fedora:**

```bash
sudo dnf install libnotify wmctrl xdotool
```

**Arch:**

```bash
sudo pacman -S libnotify wmctrl xdotool
```

**Note:** Click-to-focus is not supported on Wayland yet. Basic notifications will still work, but clicking them won't restore terminal focus. The script auto-detects Wayland via $XDG_SESSION_TYPE and gracefully degrades to basic notifications.

**macOS**

For clickable notifications that return focus to your terminal, install terminal-notifier via Homebrew:

```bash
brew install terminal-notifier
```

Without terminal-notifier, notifications will appear via osascript but won't be clickable (clicking opens Script Editor instead).

**Windows**

Windows notifications use built-in PowerShell commands and don't require additional dependencies. Click-to-focus is not currently implemented for Windows.
