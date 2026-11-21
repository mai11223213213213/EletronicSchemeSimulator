import { Router } from 'express'

import { requireAuth } from '../../middleware/auth.middleware'

import {
  create,
  getAll,
  getOne,
  update,
  remove,
} from './circuits.controller'

export const circuitsRouter = Router()

circuitsRouter.use(requireAuth)

circuitsRouter.post('/', create)
circuitsRouter.get('/', getAll)
circuitsRouter.get('/:id', getOne)
circuitsRouter.patch('/:id', update)
circuitsRouter.delete('/:id', remove)