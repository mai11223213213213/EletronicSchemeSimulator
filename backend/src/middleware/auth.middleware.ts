
import type {
  Request,
  Response,
  NextFunction,
} from 'express';

import {
  getAuthCookieName,
  getAuthCookieOptions,
  verifySessionToken,
} from '../modules/auth/auth.service';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[getAuthCookieName()];

  if (!token) {
    return res.status(401).json({
      message: 'Необхідно авторизуватися',
    });
  }

  const userId = verifySessionToken(token);

  if (!userId) {
    res.clearCookie(
      getAuthCookieName(),
      getAuthCookieOptions(),
    );

    return res.status(401).json({
      message: 'Сесія недійсна або завершилася',
    });
  }

  req.userId = userId;

  return next();
}
