#!/usr/bin/env node

/**
 * Hook handler for notifying user about transcript saving
 *
 * This script is called by Claude Code hooks on SessionEnd event.
 * It outputs a synchronous message to inform the user that the transcript
 * is being saved to Nori Agent Brain (while the async summarize hook runs in background).
 */

/**
 * Main entry point
 */
const main = (): void => {
  const output = {
    systemMessage: 'Saving transcript to nori...\n\n',
  };

  console.log(JSON.stringify(output));
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
