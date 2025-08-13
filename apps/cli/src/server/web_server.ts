import express from 'express';
import http from 'node:http';
import errorhandler from 'errorhandler';
import bodyParser from 'body-parser';
import onFinished from 'on-finished';

import routes from './routes';
import { SOCK_PATH } from './pipe_server';

import type { HttpError } from '../tools/http';
import { log, errorLog } from '../tools/log';

import type { Request, Response, NextFunction } from 'express';

export default { start, stop };

const DEFAULT_PORT = parseInt(process.env.PORT ?? '6847');

let g_server: ReturnType<typeof http.createServer> | null = null;

export interface SystemError extends Error {
  code: string;
}
export async function start(arg_port?: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const port = arg_port ?? DEFAULT_PORT;
    const app = express();

    app.enable('trust proxy');
    app.set('port', port);

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
    g_server.listen(port, 'localhost', function () {
      log('web_server.start: listening on port:', port);
      resolve(port);
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
  process.exit(0);
}
function _status(req: Request, res: Response) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send({ pid: process.pid, sock_path: SOCK_PATH });
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
    //const bytes = res.getHeader('content-length') || 0;
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
