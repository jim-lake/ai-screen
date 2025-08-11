import { format } from 'node:util';
export default {
  setDebug,
  setQuiet,
  setShowTime,
  setRemoteLogger,
  log,
  errorLog,
  remoteLog,
  debugLog,
};

let g_debugLog = Boolean(process.env.DEBUG_LOG);
let g_quiet = false;
let g_showTime = false;

export function setDebug(enable: boolean) {
  g_debugLog = enable;
}
export function setQuiet(quiet: boolean) {
  g_quiet = quiet;
}
export function setShowTime(show_time: boolean) {
  g_showTime = show_time;
}
export type RemoteLogger = (s: string, is_error: boolean) => void;
let g_logger: RemoteLogger | undefined;
export function setRemoteLogger(new_logger: RemoteLogger) {
  g_logger = new_logger;
}
export function log(...args: unknown[]): void {
  if (!g_quiet) {
    const s = format(...args);
    // eslint-disable-next-line no-console
    console.log(`${_time()}${s}`);
  }
}
export function errorLog(...args: unknown[]): void {
  const s = format(...args);
  // eslint-disable-next-line no-console
  console.error(`${_time()}${s}`);
  g_logger?.(s, true);
}
export function remoteLog(...args: unknown[]): void {
  const s = format(...args);
  if (!g_quiet) {
    // eslint-disable-next-line no-console
    console.log(`[${_time()}${s}`);
  }
  g_logger?.(s, false);
}
export function debugLog(...args: unknown[]): void {
  if (g_debugLog) {
    const s = format(...args);
    // eslint-disable-next-line no-console
    console.log(`[${_time()}${s}`);
  }
}
function _time(): string {
  return g_showTime ? `[${new Date().toUTCString()}] ` : '';
}
