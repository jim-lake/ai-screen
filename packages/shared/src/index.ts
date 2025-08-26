export type * from './ansi';
export type * from './json';
export type * from './pipe';
export type * from './rest';
export type * from './websocket';

export * from './ansi';
export * from './json';
import * as ansi from './ansi';
import * as json from './json';

export default { ...ansi, ...json };
