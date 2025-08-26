import express from 'express';

import { loadSettings, saveSettings } from '../../lib/settings';
import { requiredObject } from '../../tools/http';

import type { Request, Response } from 'express';
import type { SettingsJson, JSONObject } from '@ai-screen/shared';
import type { JsonResponse, RequestJsonBody } from '../../tools/http';

export const router = express.Router();
export default { router };

router.get('/api/1/settings/web', _getWebSettings);
router.post('/api/1/settings/web', _setWebSettings);

async function _getWebSettings(req: Request, res: JsonResponse<SettingsJson>) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const settings = (await loadSettings('web')) ?? {};
  res.send({ settings });
}
async function _setWebSettings(req: RequestJsonBody, res: Response) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  const obj = requiredObject(req, 'obj') as JSONObject;
  await saveSettings({ parentKey: 'web', obj });
  res.sendStatus(200);
}
