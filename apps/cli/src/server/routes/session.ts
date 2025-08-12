import express from 'express';
import type { Request, Response } from 'express';

import { listSessions, Session } from '../../lib/session';

import { log } from '../../tools/log';
import {
  HttpError,
  requiredProp,
  optionalArray,
  requiredObject,
} from '../../tools/http';

export const router = express.Router();
export default { router };

router.get('/api/1/session', _getSessionList);
router.post('/api/1/session/:name', _createSession);

function _getSessionList(req: Request, res: Response) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send({ session_list: listSessions() });
}
function _createSession(req: Request, res: Response) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { name } = req.params;
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
