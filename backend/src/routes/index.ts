
import { Router } from 'express';

import { authRouter } from '../modules/auth/auth.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);

// У майбутньому тут підключимо:
// apiRouter.use('/circuits', circuitsRouter);

export default apiRouter;
