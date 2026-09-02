import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables reliably regardless of process cwd
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Attempt DB connection
  await connectDB();

  // Start Express listener
  app.listen(PORT, () => {
    console.log(`🚀 [Server] Academic Study Tracker API running on http://localhost:${PORT}`);
    console.log(`🩺 [Server] Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();
