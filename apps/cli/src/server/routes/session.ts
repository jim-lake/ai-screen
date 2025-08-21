import express from 'express';

import { listSessions, Session, getSession } from '../../lib/session';
import { log } from '../../tools/log';
import {
  HttpError,
  requiredProp,
  optionalProp,
  optionalArray,
  requiredObject,
  optionalObject,
} from '../../tools/http';

import type { Request, Response } from 'express';
import type {
  SessionListJson,
  SessionJson,
  TerminalJson,
} from '@ai-screen/shared';
import type { JsonResponse } from '../../tools/http';
import type { TerminalParams } from '../../lib/terminal';

export const router = express.Router();
export default { router };

router.get('/api/1/session', _getSessionList);
router.post('/api/1/session/:name', _createSession);
router.post('/api/1/session/:name/resize', _resizeSession);
router.post('/api/1/session/:name/write', _writeToSession);
router.get('/api/1/session/:name/terminal', _getTerminalState);
router.post('/api/1/session/:name/terminal', _createTerminal);

function _getSessionList(req: Request, res: JsonResponse<SessionListJson>) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const sessions = listSessions();
  res.send({ sessions });
}
function _createSession(req: Request, res: JsonResponse<SessionJson>) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { name } = req.params;
  if (!name) {
    throw new HttpError(400, 'session name required');
  }
  const shell = requiredProp(req, 'shell', 'string');
  const cwd = requiredProp(req, 'cwd', 'string');
  const rows = requiredProp(req, 'rows', 'number');
  const columns = requiredProp(req, 'columns', 'number');
  const command = optionalArray(req, 'command', ['string']);
  const env = requiredObject(req, 'env', { key: 'value' });

  try {
    const opts = { name, shell, cwd, rows, columns, command, env };
    const session = new Session(opts);
    log('server.session._createSession: new session', name);
    res.send(session);
  } catch (e) {
    if (e instanceof Error && e.message === 'conflict') {
      throw new HttpError(409, { err: 'name_in_use' });
    }
    throw e;
  }
}
function _resizeSession(req: Request, res: Response) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { name } = req.params;
  if (!name) {
    throw new HttpError(400, 'session name required');
  }
  const rows = requiredProp(req, 'rows', 'number');
  const columns = requiredProp(req, 'columns', 'number');
  const session = getSession(name);
  if (!session) {
    throw new HttpError(404, 'session not found');
  }
  session.resize({ rows, columns });
  log(
    `server.session._resizeSession: resized session: ${name} ${columns}x${rows}`
  );
  res.sendStatus(200);
}
function _writeToSession(req: Request, res: Response) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { name } = req.params;
  if (!name) {
    throw new HttpError(400, 'session name required');
  }
  const data = requiredProp(req, 'data', 'string');
  const session = getSession(name);
  if (!session) {
    throw new HttpError(404, 'session not found');
  }
  session.write(data);
  log(
    `server.session._writeToSession: wrote to session: ${name} ${data.length} bytes`
  );
  res.sendStatus(200);
}
function _getTerminalState(req: Request, res: JsonResponse<TerminalJson>) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { name } = req.params;
  if (!name) {
    throw new HttpError(400, 'session name required');
  }
  const session = getSession(name);
  if (!session) {
    throw new HttpError(404, 'session not found');
  }
  if (!session.activeTerminal) {
    throw new HttpError(404, 'no active terminal in session');
  }
  res.send(session.activeTerminal);
}
function _createTerminal(req: Request, res: JsonResponse<TerminalJson>) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { name } = req.params;
  const shell = optionalProp(req, 'shell', 'string');
  const cwd = optionalProp(req, 'cwd', 'string');
  const command = optionalArray(req, 'command', ['string']);
  const env = optionalObject(req, 'env', { key: 'value' });

  if (!name) {
    throw new HttpError(400, 'session name required');
  }
  const session = getSession(name);
  if (!session) {
    throw new HttpError(404, 'session not found');
  }
  const params: Partial<TerminalParams> = {};
  if (shell !== undefined) {
    params.shell = shell;
  }
  if (cwd !== undefined) {
    params.cwd = cwd;
  }
  if (command !== undefined) {
    params.command = command as string[];
  }
  if (env !== undefined) {
    params.env = env;
  }
  const terminal = session.createTerminal(params);
  res.send(terminal);
}
