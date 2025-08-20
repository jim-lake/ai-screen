export {};

declare global {
  interface Window {
    __VERSION__: string | undefined;
  }
}
