import PipeServer from './pipe_server';
import WebServer from './web_server';

import { setShowTime } from '../tools/log';

import type { SystemError } from './web_server';

export default { start };

type StartResult =
  | { err: SystemError }
  | { err: null; port: number; sock_path: string };
export async function start(): Promise<StartResult> {
  setShowTime(true);
  const web_result = await WebServer.start();
  if (web_result.err) {
    return { err: web_result.err };
  }
  const sock_path = PipeServer.start();
  return { err: null, port: web_result.port, sock_path };
}
