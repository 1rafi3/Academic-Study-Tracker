import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });
dotenv.config();

import express, { Express } from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import semesterRoutes from './routes/semester.routes.js';
import courseRoutes from './routes/course.routes.js';
import classInstanceRoutes from './routes/classInstance.routes.js';
import academicEventRoutes from './routes/academicEvent.routes.js';
import holidayRoutes from './routes/holiday.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import backupRoutes from './routes/backup.routes.js';
import authRoutes from './routes/auth.routes.js';
import { requireAuth } from './middleware/auth.middleware.js';

const app: Express = express();

// Middleware
const clientUrls = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((u) => u.trim()) : [];
const allowedOrigins = [
  ...clientUrls,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true); // Permissive in dev
      }
      return callback(new Error('Blocked by CORS policy: Origin not allowed'));
    },
    credentials: true,
  })
);

// Body parsers with 50MB payload limit for full database backups & imports
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api', healthRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/semesters', requireAuth, semesterRoutes);
app.use('/api/courses', requireAuth, courseRoutes);
app.use('/api/class-instances', requireAuth, classInstanceRoutes);
app.use('/api/academic-events', requireAuth, academicEventRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);
app.use('/api/backup', requireAuth, backupRoutes);

// Root fallback
app.get('/', (req, res) => {
  res.json({
    message: 'Academic Study Tracker API Root',
    healthCheck: '/api/health',
  });
});

// Global error handler for body-parser and general errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    res.status(413).json({
      success: false,
      message: 'The uploaded backup file exceeds the maximum allowed size (50MB).',
    });
    return;
  }
  if (err.status === 400 && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'Malformed JSON payload. Please ensure the backup file contains valid JSON.',
    });
    return;
  }
  next(err);
});

export default app;
