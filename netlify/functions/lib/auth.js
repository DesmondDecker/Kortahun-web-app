// netlify/functions/lib/auth.js
const jwt = require('jsonwebtoken');

const getSecret = () => process.env.JWT_SECRET;

function signToken(payload) {
  const secret = getSecret();
  if (!secret) {
    throw Object.assign(new Error('JWT_SECRET is not configured on the server'), { status: 500 });
  }
  return jwt.sign(payload, secret, { expiresIn: '30d' });
}

function verifyToken(token) {
  const secret = getSecret();
  if (!secret) {
    throw Object.assign(new Error('JWT_SECRET is not configured on the server'), { status: 500 });
  }
  return jwt.verify(token, secret);
}

function getTokenFromHeader(headers) {
  const auth = headers.authorization || headers.Authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function requireAuth(headers) {
  const token = getTokenFromHeader(headers);
  if (!token) throw Object.assign(new Error('No token provided'), { status: 401 });
  try {
    return verifyToken(token);
  } catch (err) {
    if (err.status === 500) throw err; // Re-throw server configuration errors
    throw Object.assign(new Error('Invalid or expired token'), { status: 401 });
  }
}

/**
 * RBAC Helper
 * @param {Object} payload Decoded JWT payload
 * @param {Array} roles Allowed roles
 */
function checkRole(payload, roles) {
  if (!roles.includes(payload.role)) {
    throw Object.assign(new Error('Permission denied: insufficient privileges'), { status: 403 });
  }
}

async function logAction(user, action, resource, resourceId, details = {}) {
  const AuditLog = require('./models/AuditLog');
  try { await AuditLog.create({ user, action, resource, resourceId, details, timestamp: new Date() }); } catch (e) { console.error('Audit Log failed', e); }
}

function ok(body, status = 200) {
  return {
    statusCode: status,
    headers: { 
      'Content-Type': 'application/json', 
      'Access-Control-Allow-Origin': process.env.URL || '*' 
    },
    body: JSON.stringify(body),
  };
}

function err(message, status = 500, extra = {}) {
  return {
    statusCode: status,
    headers: { 
      'Content-Type': 'application/json', 
      'Access-Control-Allow-Origin': process.env.URL || '*' 
    },
    body: JSON.stringify({ success: false, message, ...extra }),
  };
}

function cors() {
  return {
    statusCode: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    },
    body: '',
  };
}

module.exports = { signToken, verifyToken, requireAuth, checkRole, logAction, ok, err, cors };
