export default { log, errorLog };

export function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
}
export function errorLog(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.error(...args);
}
