import express from 'express';

import session from './session';
import settings from './settings';
import terminal from './terminal';

export const router = express.Router();
export default { router };

router.use(session.router);
router.use(settings.router);
router.use(terminal.router);
