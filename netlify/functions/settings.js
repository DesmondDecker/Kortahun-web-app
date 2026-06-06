const connectDB = require('./lib/mongodb');
const Setting   = require('./lib/models/Setting');
const { requireAuth, ok, err, cors } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();
  const method = event.httpMethod;
  let body = {}; try { body = JSON.parse(event.body||'{}'); } catch {}
  try {
    await connectDB();
    requireAuth(event.headers);
    if (method==='GET') {
      const items = await Setting.find();
      const data = items.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
      return ok({ success:true, data });
    }
    if (method==='POST') {
      const ops = Object.entries(body).map(([key,value]) => ({
        updateOne: { filter:{ key }, update:{ $set:{ value: String(value) } }, upsert:true }
      }));
      if (ops.length) await Setting.bulkWrite(ops);
      return ok({ success:true });
    }
    return err('Not found',404);
  } catch(e) { return err(e.message, e.status||500); }
};
