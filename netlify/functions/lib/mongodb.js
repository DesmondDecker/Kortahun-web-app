const mongoose = require('mongoose');
const dns = require('dns');
const path = require('path');

// Use process.cwd() to reliably find the .env file in the project root
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// Fix for local DNS resolution issues with MongoDB Atlas SRV records.
// We use a global guard to ensure this only runs once and doesn't break localhost resolution.
if (!global.dnsOverrideApplied) {
  if (dns.getServers().includes('127.0.0.1')) {
    // Only override if the default resolver is local and potentially failing SRV lookups
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }
  global.dnsOverrideApplied = true;
}

/**
 * Global is used here to maintain a cached connection across hot-reloads
 * in development and across function invocations in production.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

mongoose.set('strictQuery', false);
// Enable buffering. This prevents the "Cannot call findOne" error by 
// allowing Mongoose to wait for the connection to finalize.
mongoose.set('bufferCommands', true); 
mongoose.set('bufferTimeoutMS', 30000);

async function connectDB() {
  const state = mongoose.connection.readyState;

  // 1. If connected (1), return the connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw Object.assign(new Error('MONGO_URI is missing'), { status: 500 });
  }

  // 2. If disconnected (0) or disconnecting (3), clear the cached promise to force a retry
  if (state === 0 || state === 3) {
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      serverSelectionTimeoutMS: 10000, 
      connectTimeoutMS: 10000,
      family: 4 // Resolve IPv4 for local Windows stability
    };

    console.log('=> Establishing new MongoDB connection...');
    cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((m) => {
      console.log('=> MongoDB connected');
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    console.error('=> MongoDB connection error:', err.message);
    cached.promise = null;
    throw err;
  }

  return mongoose.connection;
}

module.exports = connectDB;
