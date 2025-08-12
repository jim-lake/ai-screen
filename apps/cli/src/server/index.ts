import PipeServer from './pipe_server';
import WebServer from './web_server';

import { setShowTime } from '../tools/log';

export default { start };

export interface ServerStartResult {
  port: number;
  sock_path: string;
  pid: number;
}
export async function start(): Promise<ServerStartResult> {
  setShowTime(true);
  const port = await WebServer.start();
  const sock_path = PipeServer.start();
  return { port, sock_path, pid: process.pid };
}
