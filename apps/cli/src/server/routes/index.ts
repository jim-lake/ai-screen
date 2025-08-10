import express from 'express';

import session from './session';
import terminal from './terminal';

export const router = express.Router();
export default { router };

router.use(session.router);
router.use(terminal.router);
