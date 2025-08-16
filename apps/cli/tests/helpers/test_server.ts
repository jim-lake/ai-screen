#!/usr/bin/env tsx

import { startServer } from '../../src/index';
import { log, errorLog } from './log_utils';

async function _main() {
  try {
    const result = await startServer({ foreground: true, port: 0 });
    log('test_server._main: port:', result.port);
    if (process.send) {
      process.send({
        event: 'server-started',
        port: result.port,
        pid: result.pid,
      });
    }
    process.on('SIGTERM', () => {
      process.exit(0);
    });
    process.on('SIGINT', () => {
      process.exit(0);
    });
  } catch (e: unknown) {
    errorLog('Failed to start test server:', e);
    process.exit(1);
  }
}
_main().catch((e: unknown) => {
  errorLog('Test server error:', e);
  process.exit(1);
});
