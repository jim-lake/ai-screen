import express from 'express';

import session from './session';
import window from './window';

export const router = express.Router();
export default { router };

router.use(session.router);
router.use(window.router);
