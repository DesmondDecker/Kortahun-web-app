const connectDB = require('./lib/mongodb');
const Expense   = require('./lib/models/Expense');
const { requireAuth, ok, err, cors } = require('./lib/auth');

function sub(event) { return (event.path||'').replace(/.*\/expenses\/?/,'').replace(/^\/+|\/+$/g,''); }

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();
  const method = event.httpMethod, subPath = sub(event);
  const qs = event.queryStringParameters || {};
  let body = {}; try { body = JSON.parse(event.body||'{}'); } catch {}
  try {
    await connectDB();
    requireAuth(event.headers);
    if (method==='GET' && !subPath) {
      const filter = {};
      if (qs.category) filter.category = qs.category;
      const items = await Expense.find(filter).sort({ expense_date:-1 }).limit(500);
      const filtered = qs.search ? items.filter(e => e.description?.toLowerCase().includes(qs.search.toLowerCase()) || e.vendor?.toLowerCase().includes(qs.search.toLowerCase())) : items;
      return ok({ success:true, data: filtered });
    }
    if (method==='GET' && subPath==='stats') {
      const agg = await Expense.aggregate([{ $group:{ _id:'$category', total:{ $sum:'$amount' }, count:{ $sum:1 } } }]);
      const totalAmount = agg.reduce((s,a)=>s+a.total,0);
      return ok({ success:true, data:{ byCategory: agg, totalAmount } });
    }
    if (method==='GET' && subPath) { const item = await Expense.findById(subPath); if(!item) return err('Not found',404); return ok({success:true,data:item}); }
    const sanitize = (d) => {
      const o = { ...d };
      if (o.vehicle_id === '') o.vehicle_id = null;
      if (o.driver_id  === '') o.driver_id  = null;
      if (o.amount !== undefined) o.amount = Number(o.amount) || 0;
      return o;
    };
    if (method==='POST') { const item = await Expense.create(sanitize(body)); return ok({success:true,data:item},201); }
    if (method==='PUT' && subPath) { const item = await Expense.findByIdAndUpdate(subPath,sanitize(body),{new:true,runValidators:true}); if(!item) return err('Not found',404); return ok({success:true,data:item}); }
    if (method==='DELETE' && subPath) { await Expense.findByIdAndDelete(subPath); return ok({success:true}); }
    return err('Not found',404);
  } catch(e) { return err(e.message, e.status||500); }
};
