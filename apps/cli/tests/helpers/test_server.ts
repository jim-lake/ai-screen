#!/usr/bin/env tsx

// Test server entry point - runs the server in test mode
import { startServer } from '../../src/index';
import { errorLog } from './log_utils';

async function _main() {
  try {
    const result = await startServer({ foreground: true, port: 6847 });

    // Send IPC message to parent process if we're a child process
    if (process.send) {
      process.send({
        event: 'server-started',
        port: result.port,
        pid: result.pid,
      });
    }

    // Keep the process alive
    process.on('SIGTERM', () => {
      process.exit(0);
    });

    process.on('SIGINT', () => {
      process.exit(0);
    });
  } catch (error: unknown) {
    const error_message =
      error instanceof Error ? error.message : String(error);
    errorLog(`Failed to start test server: ${error_message}`);
    process.exit(1);
  }
}

_main().catch((error: unknown) => {
  const error_message = error instanceof Error ? error.message : String(error);
  errorLog(`Test server error: ${error_message}`);
  process.exit(1);
});
