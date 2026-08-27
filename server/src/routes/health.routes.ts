import { Router, Request, Response } from 'express';
import { getDBStatus } from '../config/db.js';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  const dbStatus = getDBStatus();
  
  res.status(200).json({
    status: 'ok',
    message: 'Academic Study Tracker API is operating smoothly.',
    service: 'academic-study-tracker-server',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
  });
});

export default router;
