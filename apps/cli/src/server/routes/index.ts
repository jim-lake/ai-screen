import express from 'express';

import session from './session';

export const router = express.Router();
export default { router };

router.use(session.router);
