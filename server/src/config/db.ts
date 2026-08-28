import mongoose from 'mongoose';
import dns from 'node:dns';

// Ensure Node.js can resolve MongoDB Atlas SRV records on Windows/various networks
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Ignore if custom DNS cannot be set
}

export type DBConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';


let connectionStatus: DBConnectionStatus = 'disconnected';
let connectionError: string | null = null;

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    connectionStatus = 'disconnected';
    connectionError = 'MONGODB_URI environment variable is not defined.';
    console.warn('⚠️ [Database] MONGODB_URI not found in environment. Running without active MongoDB connection.');
    return;
  }

  try {
    connectionStatus = 'connecting';
    console.log('🔄 [Database] Attempting connection to MongoDB...');
    
    // Connect with a 5s timeout to prevent hanging if local Mongo is not up
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    connectionStatus = 'connected';
    connectionError = null;
    console.log(`✅ [Database] MongoDB Connected: ${mongoose.connection.host}`);
  } catch (err: unknown) {
    connectionStatus = 'error';
    const message = err instanceof Error ? err.message : String(err);
    connectionError = message;
    console.error(`❌ [Database] MongoDB Connection Error: ${message}`);
    console.warn('💡 [Database] Backend server will continue running. Update MONGODB_URI in server/.env when available.');
  }

  mongoose.connection.on('disconnected', () => {
    connectionStatus = 'disconnected';
    console.warn('⚠️ [Database] MongoDB disconnected.');
  });

  mongoose.connection.on('reconnected', () => {
    connectionStatus = 'connected';
    connectionError = null;
    console.log('✅ [Database] MongoDB reconnected.');
  });
};

export const getDBStatus = () => ({
  status: connectionStatus,
  error: connectionError,
  host: mongoose.connection.host || null,
  database: mongoose.connection.name || null,
});
