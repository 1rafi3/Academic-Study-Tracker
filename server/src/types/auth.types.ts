import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: AuthenticatedUser;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: AuthenticatedUser;
    }
  }
}
