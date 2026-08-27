import express, { Express } from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import semesterRoutes from './routes/semester.routes.js';
import courseRoutes from './routes/course.routes.js';

const app: Express = express();

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', healthRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/courses', courseRoutes);


// Root fallback
app.get('/', (req, res) => {
  res.json({
    message: 'Academic Study Tracker API Root',
    healthCheck: '/api/health',
  });
});

export default app;
