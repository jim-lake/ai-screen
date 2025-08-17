import '@xterm/headless';

declare module '@xterm/headless' {
  interface Terminal {
    _core: { coreService: { isCursorHidden: boolean } };
  }
}
export {};
