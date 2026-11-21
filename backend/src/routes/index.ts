import { Router } from 'express'

import { authRouter } from '../modules/auth/auth.routes'
import { circuitsRouter } from '../modules/circuits/circuits.routes'

const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/circuits', circuitsRouter)

export default apiRouter