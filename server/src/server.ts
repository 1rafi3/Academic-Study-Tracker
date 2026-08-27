import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
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
