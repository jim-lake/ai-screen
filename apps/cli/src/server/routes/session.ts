import express from 'express';
import type { Request, Response } from 'express';

export const router = express.Router();
export default { router };

router.get('/api/1/session', _getSessionList);

function _getSessionList(req: Request, res: Response) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendStatus(501);
}
