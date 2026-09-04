import { Router, Request, Response } from 'express';
import { getDBStatus } from '../config/db.js';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  const dbStatus = getDBStatus();
  
  res.status(200).json({
    status: dbStatus.status === 'connected' ? 'ok' : 'degraded',
    message: 'Academic Study Tracker API is operating smoothly.',
    service: 'academic-study-tracker-server',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus.status,
    },
    ...(!isProd && {
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      databaseDetails: dbStatus,
    }),
  });
});

export default router;
