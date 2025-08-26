import express from 'express';

import { getSession } from '../../lib/session';
import { HttpError } from '../../tools/http';

import type { Request } from 'express';
import type { TerminalJson, ScrollbackJson } from '@ai-screen/shared';
import type { JsonResponse } from '../../tools/http';

export const router = express.Router();
export default { router };

router.get('/api/1/session/:name/terminal/:id', _getTerminal);
router.get('/api/1/session/:name/terminal/:id/scrollback', _getScrollback);

function _getTerminal(req: Request, res: JsonResponse<TerminalJson>) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { name, id } = req.params;
  const terminal = _findTerminal(name, id);
  res.send(terminal);
}
function _getScrollback(req: Request, res: JsonResponse<ScrollbackJson>) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const { name, id } = req.params;
  const terminal = _findTerminal(name, id);
  res.send({ scrollback: terminal.getScrollback() });
}
function _findTerminal(name?: string, id?: string) {
  if (!name || !id) {
    throw new HttpError(400, 'session name and terminal id required');
  }
  const terminal_id = parseInt(id);
  const session = getSession(name);
  if (!session) {
    throw new HttpError(404, 'session not found');
  }
  const terminal = session.terminals.find((t) => t.id === terminal_id);
  if (!terminal) {
    throw new HttpError(404, 'terminal not found');
  }
  return terminal;
}
