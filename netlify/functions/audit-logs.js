const connectDB = require('./lib/mongodb');
const AuditLog  = require('./lib/models/AuditLog');
const { requireAuth, ok, err, cors } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();
  const qs = event.queryStringParameters || {};
  try {
    await connectDB();
    requireAuth(event.headers);  // any authenticated user

    const limit  = Math.min(parseInt(qs.limit) || 100, 500);
    const filter = {};
    if (qs.resource) filter.resource = qs.resource;
    if (qs.action)   filter.action   = qs.action;
    if (qs.user)     filter.user     = new RegExp(qs.user, 'i');

    const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(limit);
    return ok({ success: true, data: logs, total: logs.length });
  } catch (e) {
    return err(e.message, e.status || 500);
  }
};
