const connectDB = require('./lib/mongodb');
const Vehicle   = require('./lib/models/Vehicle');
const { requireAuth, ok, err, cors } = require('./lib/auth');

function sub(event) { return (event.path||'').replace(/.*\/vehicles\/?/,'').replace(/^\/+|\/+$/g,''); }

function sanitize(d) {
  const o = { ...d };
  if (o.assigned_driver_id === '') o.assigned_driver_id = null;
  if (o.capacity_litres !== undefined) o.capacity_litres = Number(o.capacity_litres) || 0;
  return o;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();
  const method = event.httpMethod, subPath = sub(event);
  let body = {}; try { body = JSON.parse(event.body||'{}'); } catch {}
  try {
    await connectDB();
    requireAuth(event.headers);

    if (method==='GET' && !subPath) {
      const items = await Vehicle.find().sort({ createdAt:-1 });
      return ok({ success:true, data: items });
    }

    if (method==='GET' && subPath==='stats') {
      const [total, active, service] = await Promise.all([
        Vehicle.countDocuments(),
        Vehicle.countDocuments({ status:'Active' }),
        Vehicle.countDocuments({ status:'Under Service' }),
      ]);
      return ok({ success:true, data:{ total, active, service } });
    }

    if (method==='GET' && subPath) {
      const item = await Vehicle.findById(subPath);
      if (!item) return err('Not found', 404);
      return ok({ success:true, data: item });
    }

    if (method==='POST') {
      if (!body.vehicle_number?.trim()) return err('vehicle_number is required', 400);
      const item = await Vehicle.create(sanitize(body));
      return ok({ success:true, data: item }, 201);
    }

    if (method==='PUT' && subPath) {
      const item = await Vehicle.findByIdAndUpdate(subPath, sanitize(body), { new:true, runValidators:true });
      if (!item) return err('Not found', 404);
      return ok({ success:true, data: item });
    }

    if (method==='DELETE' && subPath) {
      await Vehicle.findByIdAndDelete(subPath);
      return ok({ success:true });
    }

    return err('Not found', 404);
  } catch(e) {
    if (e.code === 11000) return err('Vehicle number already exists', 400);
    if (e.name === 'ValidationError') return err('Validation: ' + Object.values(e.errors).map(x=>x.message).join(', '), 400);
    if (e.name === 'CastError') return err('Invalid ID', 400);
    if (e.status === 401) return err(e.message, 401);
    return err(e.message || 'Server error', e.status || 500);
  }
};
