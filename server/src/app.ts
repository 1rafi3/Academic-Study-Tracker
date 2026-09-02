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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

export default app;
