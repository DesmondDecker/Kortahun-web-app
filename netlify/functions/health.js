// netlify/functions/health.js
const connectDB  = require('./lib/mongodb');
const mongoose   = require('mongoose');
const { ok, cors } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();

  let dbStatus = 'disconnected';
  try { // Attempt to connect to DB to get its status
    const conn = await connectDB();
    dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'connecting';
  } catch (e) {
    return ok({
      status: 'DB_CONNECTION_FAILED',
      database: 'error',
      error: e.message,
      timestamp: new Date().toISOString()
    }, 500);
  }

  return ok({
    status: 'HEALTHY',
    system: 'Kortahun United Management System',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development', // Default to development if not set
    platform: 'Netlify Functions + MongoDB Atlas',
  });
};
