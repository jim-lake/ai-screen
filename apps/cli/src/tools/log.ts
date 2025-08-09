import { format } from "node:util";
export default {
  setRemoteLogger,
  log,
  errorLog,
  remoteLog,
};

export type RemoteLogger = (s: string, is_error: boolean) => void;
let g_logger: RemoteLogger | undefined;
export function setRemoteLogger(new_logger: RemoteLogger) {
  g_logger = new_logger;
}
export function log(...args: unknown[]): void {
  const s = format(...args);
  // eslint-disable-next-line no-console
  console.log(`[${new Date().toUTCString()}] ${s}`);
}
export function errorLog(...args: unknown[]): void {
  const s = format(...args);
  // eslint-disable-next-line no-console
  console.error(`[${new Date().toUTCString()}] ${s}`);
  g_logger?.(s, true);
}
export function remoteLog(...args: unknown[]): void {
  const s = format(...args);
  // eslint-disable-next-line no-console
  console.log(`[${new Date().toUTCString()}] ${s}`);
  g_logger?.(s, false);
}
