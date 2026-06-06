// netlify/functions/customers.js
const connectDB  = require('./lib/mongodb');
const Customer   = require('./lib/models/Customer');
const { requireAuth, logAction, ok, err, cors } = require('./lib/auth');

// Extract trailing path segment after /customers
function getSubPath(event) {
  return (event.path || '')
    .replace(/.*\/customers\/?/, '')
    .replace(/^\/+|\/+$/g, ''); // Remove leading and trailing slashes
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();

  const method  = event.httpMethod;
  const subPath = getSubPath(event);
  const qs      = event.queryStringParameters || {};
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  try {
    await connectDB();
    const user = requireAuth(event.headers);

    // GET /api/customers/stats
    if (method === 'GET' && subPath === 'stats') {
      const [stats] = await Customer.aggregate([{
        $group: {
          _id: null,
          total:     { $sum: 1 },
          active:    { $sum: { $cond: [{ $eq: ['$status','active'] }, 1, 0] } },
          inactive:  { $sum: { $cond: [{ $eq: ['$status','inactive'] }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ['$status','suspended'] }, 1, 0] } },
          water:     { $sum: { $cond: [{ $in: ['water','$services'] }, 1, 0] } },
          sewage:    { $sum: { $cond: [{ $in: ['sewage','$services'] }, 1, 0] } },
        }
      }]);
      return ok({ success: true, data: stats || { total:0, active:0, inactive:0, suspended:0, water:0, sewage:0 } });
    }

    // GET /api/customers/search?q=
    if (method === 'GET' && subPath === 'search') {
      if (!qs.q) return err('Search query q is required', 400);
      const re = new RegExp(qs.q, 'i');
      const results = await Customer.find({
        $or: [{ name: re }, { email: re }, { phone: re }, { address: re }, { meterNumber: re }]
      }).limit(50);
      return ok({ success: true, data: results });
    }

    // POST /api/customers/check-exists
    if (method === 'POST' && subPath === 'check-exists') {
      const { email, phone } = body;
      if (!email && !phone) return err('email or phone required', 400);
      const q = [];
      if (email) q.push({ email });
      if (phone) q.push({ phone });
      const found = await Customer.findOne({ $or: q });
      return ok({ success: true, exists: !!found, customer: found });
    }

    // POST /api/customers/generate-meter
    if (method === 'POST' && subPath === 'generate-meter') {
      const services = body.services || [];
      const prefix = services.includes('water') ? 'W' : 'S';
      let meter, unique = false;
      for (let i = 0; i < 100 && !unique; i++) {
        const n = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        meter = `${prefix}${n}`;
        unique = !(await Customer.findOne({ meterNumber: meter }));
      }
      if (!unique) return err('Could not generate unique meter number', 500);
      return ok({ success: true, meterNumber: meter });
    }

    // GET /api/customers/:id
    if (method === 'GET' && subPath && !subPath.includes('/')) {
      const c = await Customer.findById(subPath);
      if (!c) return err('Customer not found', 404);
      return ok({ success: true, data: c });
    }

    // PUT /api/customers/:id
    if (method === 'PUT' && subPath && !subPath.includes('/')) {
      body.lastUpdated = new Date();

      // Normalize unique fields for updates
      if (body.email) body.email = body.email.toLowerCase().trim();
      if (body.phone) body.phone = body.phone.trim();
      if (body.meterNumber !== undefined) {
        const m = body.meterNumber?.trim();
        body.meterNumber = m || undefined; // Use undefined to avoid unique collisions on blanks
      }

      const c = await Customer.findByIdAndUpdate(subPath, body, { new: true, runValidators: true });
      if (!c) return err('Customer not found', 404);
      await logAction(user.username, 'UPDATE', 'Customer', subPath);
      return ok({ success: true, data: c, message: 'Customer updated' });
    }

    // PATCH /api/customers/:id/status
    if (method === 'PATCH' && subPath.endsWith('/status')) {
      const id = subPath.replace('/status', '');
      const { status } = body;
      const valid = ['active','inactive','suspended'];
      if (!valid.includes(status)) return err(`Status must be one of ${valid.join(', ')}`, 400);
      const c = await Customer.findByIdAndUpdate(id, { status, lastUpdated: new Date() }, { new: true });
      if (!c) return err('Customer not found', 404);
      await logAction(user.username, 'UPDATE_STATUS', 'Customer', id, { status });
      return ok({ success: true, data: c });
    }

    // DELETE /api/customers/:id
    if (method === 'DELETE' && subPath && !subPath.includes('/')) {
      const c = await Customer.findByIdAndDelete(subPath);
      if (!c) return err('Customer not found', 404);
      await logAction(user.username, 'DELETE', 'Customer', subPath);
      return ok({ success: true, message: 'Customer deleted' });
    }

    // GET /api/customers  (list with pagination + filters)
    if (method === 'GET' && !subPath) {
      const { page = 1, limit = 20, search = '', status, service, sortBy = 'createdAt', sortOrder = 'desc' } = qs;
      const filter = {};
      if (search) {
        const re = new RegExp(search, 'i');
        filter.$or = [{ name: re }, { email: re }, { phone: re }, { address: re }];
      }
      if (status) filter.status = status;
      if (service) filter.services = service;

      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [customers, total] = await Promise.all([
        Customer.find(filter).sort(sort).skip(skip).limit(parseInt(limit)),
        Customer.countDocuments(filter),
      ]);
      return ok({ success: true, customers, pagination: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) } });
    }

    // POST /api/customers  (create)
    if (method === 'POST' && !subPath) {
      let { name, email, phone, address, meterNumber } = body;
      if (!name || !email || !phone || !address) return err('name, email, phone and address are required', 400);

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Invalid email format', 400);
      
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedPhone = phone.trim();
      const normalizedMeter = meterNumber?.trim() || undefined;

      // Update body with normalized values to ensure they are saved correctly
      body.email = normalizedEmail;
      body.phone = normalizedPhone;
      // Use undefined so the field is omitted from the DB document if blank
      body.meterNumber = normalizedMeter;

      const queryConditions = [];
      if (normalizedEmail) queryConditions.push({ email: normalizedEmail });
      if (normalizedPhone) queryConditions.push({ phone: normalizedPhone });
      if (normalizedMeter) queryConditions.push({ meterNumber: normalizedMeter });

      if (queryConditions.length > 0) {
        const existing = await Customer.findOne({ $or: queryConditions });
        if (existing) {
          let msg = 'Field';
          if (existing.email === normalizedEmail) msg = 'Email';
          else if (existing.phone === normalizedPhone) msg = 'Phone number';
          else if (existing.meterNumber === normalizedMeter) msg = 'Meter number';
          return err(`${msg} already exists`, 400);
        }
      }

      const c = await Customer.create(body);
      await logAction(user.username, 'CREATE', 'Customer', c._id);
      return ok({ success: true, data: c, id: c._id }, 201);
    }

    return err('Endpoint not found', 404);
  } catch (e) {
    if (e.status === 401) return err(e.message, 401);
    if (e.name === 'ValidationError') {
      return err('Validation error', 400, { errors: Object.values(e.errors).map(x => x.message) });
    }
    if (e.code === 11000) {
      const field = Object.keys(e.keyPattern || {})[0] || 'Field';
      const label = field === 'meterNumber' ? 'Meter number' : 
                    field === 'email' ? 'Email' : 
                    field === 'phone' ? 'Phone number' : 
                    field.replace(/([A-Z])/g, ' $1').toLowerCase();
      
      return err(`${label.charAt(0).toUpperCase() + label.slice(1)} already exists`, 400);
    }
    if (e.name === 'CastError') return err('Invalid ID format', 400);
    console.error('[customers]', e);
    return err('Server error', 500);
  }
};
