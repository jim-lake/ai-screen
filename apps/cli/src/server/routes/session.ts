import express from 'express';
import type { Request, Response } from 'express';

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

export const router = express.Router();
export default { router };

router.get('/api/1/session', _getSessionList);
router.post('/api/1/session/:name', _createSession);
router.post('/api/1/session/:name/resize', _resizeSession);
router.post('/api/1/session/:name/write', _writeToSession);
router.get('/api/1/session/:name/terminal', _getTerminalState);
router.post('/api/1/session/:name/terminal', _createTerminal);

function _getSessionList(req: Request, res: Response) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send({ session_list: listSessions() });
}

function _createSession(req: Request, res: Response) {
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

  const session = getSession(name);
  if (!session) {
    throw new HttpError(404, 'session not found');
  }

  const rows = requiredProp(req, 'rows', 'number');
  const columns = requiredProp(req, 'columns', 'number');

  session.resize({ rows, columns });
  log(
    'server.session._resizeSession: resized session',
    name,
    `${columns}x${rows}`
  );
  res.send({ success: true, rows, columns });
}

function _writeToSession(req: Request, res: Response) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { name } = req.params;
  if (!name) {
    throw new HttpError(400, 'session name required');
  }

  const session = getSession(name);
  if (!session) {
    throw new HttpError(404, 'session not found');
  }

  const data = requiredProp(req, 'data', 'string');

  session.write(data);
  log(
    'server.session._writeToSession: wrote to session',
    name,
    `${data.length} bytes`
  );
  res.send({ success: true, bytes_written: data.length });
}

function _getTerminalState(req: Request, res: Response) {
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

  const screen_state = session.activeTerminal.getScreenState();
  log('server.session._getTerminalState: got terminal state for session', name);
  res.send({
    terminal_id: session.activeTerminal.id,
    screen_state,
    terminal_count: session.terminals.length,
  });
}

function _createTerminal(req: Request, res: Response) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { name } = req.params;
  if (!name) {
    throw new HttpError(400, 'session name required');
  }

  const session = getSession(name);
  if (!session) {
    throw new HttpError(404, 'session not found');
  }

  // Optional parameters for terminal creation using utility functions
  const terminal_params: Partial<{
    shell: string;
    cwd: string;
    command: string[];
    env: Record<string, string>;
  }> = {};

  // Check for optional parameters using utility functions
  const shell = optionalProp(req, 'shell', 'string');
  if (shell !== undefined) {
    terminal_params.shell = shell;
  }

  const cwd = optionalProp(req, 'cwd', 'string');
  if (cwd !== undefined) {
    terminal_params.cwd = cwd;
  }

  const command = optionalArray(req, 'command', ['string']);
  if (command !== undefined) {
    terminal_params.command = command as string[];
  }

  const env = optionalObject(req, 'env', { key: 'value' });
  if (env !== undefined) {
    terminal_params.env = env;
  }

  const terminal = session.createTerminal(terminal_params);
  log(
    'server.session._createTerminal: created terminal in session',
    name,
    `terminal_id: ${terminal.id}`
  );
  res.send({
    terminal_id: terminal.id,
    session_name: name,
    terminal_count: session.terminals.length,
    is_active: session.activeTerminal === terminal,
  });
}
