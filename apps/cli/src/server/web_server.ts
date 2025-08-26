import express from 'express';
import http from 'node:http';
import errorhandler from 'errorhandler';
import bodyParser from 'body-parser';
import onFinished from 'on-finished';

import routes from './routes';
import { SOCK_PATH } from './pipe_server';
import WssServer from './wss_server';

import type { HttpError } from '../tools/http';
import { log, errorLog } from '../tools/log';

import type { Request, Response, NextFunction } from 'express';

export default { start, stop };

let g_server: ReturnType<typeof http.createServer> | null = null;

export interface SystemError extends Error {
  code: string;
}
export interface StartParams {
  port: number;
  host?: string;
}
export async function start(params: StartParams): Promise<number> {
  return new Promise((resolve, reject) => {
    const app = express();

    app.enable('trust proxy');
    app.set('port', params.port);

    app.use(_logHandler);
    app.use(_allowCrossDomain);
    app.use(_allowText);
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get('/status', _status);
    app.get('/api/1/status', _status);
    app.get('/quit', _quit);
    app.use(routes.router);
    app.use(_throwHandler);

    g_server = http.createServer(app);
    g_server.on('error', (err) => {
      reject(err);
    });
    g_server.listen(params.port, params.host ?? 'localhost', function () {
      const addr = g_server?.address();
      const listen_port = typeof addr == 'object' ? (addr?.port ?? 0) : 0;
      log('web_server.start: listening on port:', listen_port);
      if (g_server) {
        WssServer.start({ server: g_server });
      }
      resolve(listen_port);
    });
  });
}
export async function stop(): Promise<void> {
  return new Promise((resolve) => {
    if (g_server) {
      g_server.close(() => {
        g_server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}
function _quit(req: Request, res: Response) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  log('ai-screen: cli-web-server: quitting!');
  res.sendStatus(200);
  g_server?.close(() => {
    log('ai-screen: cli-web-server: closed.');
    process.exit(0);
  });
}
function _status(req: Request, res: Response) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const port = req.app.get('port') as number;
  res.send({ pid: process.pid, sock_path: SOCK_PATH, port });
}
function _allowCrossDomain(req: Request, res: Response, next: NextFunction) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'content-type,accept');
  res.header('Access-Control-Max-Age', '3600');
  if (req.method === 'OPTIONS') {
    res.header('Cache-Control', 'no-cache,no-store,must-revalidate');
    res.sendStatus(204);
  } else {
    next();
  }
}
function _allowText(req: Request, res: Response, next: NextFunction) {
  if (req.is('text/plain')) {
    req.headers['content-type'] = 'application/json';
  }
  next();
}
function _throwHandler(
  err: HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err.code && err.body && typeof err.code === 'number') {
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.status(err.code).send(err.body);
  } else {
    errorLog('web_server._throwHandler: err:', err);
    res.header('Cache-control', 'no-cache, no-store, must-revalidate');
    errorhandler()(err, req, res, next);
  }
}
function _logHandler(req: Request, res: Response, next: NextFunction) {
  const start_time = Date.now();
  onFinished(res, () => {
    const ms = Date.now() - start_time;
    const referrer = req.get('referrer') ?? '';
    const ua = req.get('user-agent') ?? '';
    log(
      `${req.ip} "${req.method} ${req.originalUrl} HTTP/${req.httpVersionMajor}.${
        req.httpVersionMinor
      }" ${res.statusCode} ${ms}(ms) "${referrer}" "${ua}"`
    );
  });
  next();
}
