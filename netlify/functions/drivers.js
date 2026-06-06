const connectDB = require('./lib/mongodb');
const Driver    = require('./lib/models/Driver');
const { requireAuth, ok, err, cors } = require('./lib/auth');

function sub(event) { return (event.path||'').replace(/.*\/drivers\/?/,'').replace(/^\/+|\/+$/g,''); }

function sanitize(d) {
  const o = { ...d };
  if (o.assigned_vehicle_id === '') o.assigned_vehicle_id = null;
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
      const items = await Driver.find().sort({ createdAt:-1 });
      return ok({ success:true, data: items });
    }

    if (method==='GET' && subPath==='stats') {
      const [total, available, onDelivery] = await Promise.all([
        Driver.countDocuments(),
        Driver.countDocuments({ status:'Available' }),
        Driver.countDocuments({ status:'On Delivery' }),
      ]);
      return ok({ success:true, data:{ total, available, onDelivery } });
    }

    if (method==='GET' && subPath) {
      const item = await Driver.findById(subPath);
      if (!item) return err('Not found', 404);
      return ok({ success:true, data: item });
    }

    if (method==='POST') {
      if (!body.full_name?.trim()) return err('full_name is required', 400);
      const item = await Driver.create(sanitize(body));
      return ok({ success:true, data:item }, 201);
    }

    if (method==='PUT' && subPath) {
      const item = await Driver.findByIdAndUpdate(subPath, sanitize(body), { new:true, runValidators:true });
      if (!item) return err('Not found', 404);
      return ok({ success:true, data:item });
    }

    if (method==='DELETE' && subPath) {
      await Driver.findByIdAndDelete(subPath);
      return ok({ success:true });
    }

    return err('Not found', 404);
  } catch(e) {
    if (e.name === 'ValidationError') return err('Validation: ' + Object.values(e.errors).map(x=>x.message).join(', '), 400);
    if (e.name === 'CastError') return err('Invalid ID', 400);
    if (e.status === 401) return err(e.message, 401);
    return err(e.message || 'Server error', e.status || 500);
  }
};
