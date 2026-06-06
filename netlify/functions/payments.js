const mongoose  = require('mongoose');
const connectDB = require('./lib/mongodb');
const { requireAuth, ok, err, cors } = require('./lib/auth');

function sub(event) { return (event.path||'').replace(/.*\/payments\/?/,'').replace(/^\/+|\/+$/g,''); }

function sanitize(d) {
  const o = { ...d };
  // Normalize customer and delivery IDs from possible frontend variations
  const cid = o.customer || o.customer_id;
  const did = o.delivery || o.delivery_id;

  o.customer = (cid && mongoose.Types.ObjectId.isValid(cid)) ? cid : null;
  o.delivery = (did && mongoose.Types.ObjectId.isValid(did)) ? did : null;

  if (o.amount !== undefined) o.amount = Number(o.amount) || 0;
  return o;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();
  const method = event.httpMethod, subPath = sub(event);
  const qs = event.queryStringParameters || {};
  let body = {}; try { body = JSON.parse(event.body||'{}'); } catch {}
  try {
    await connectDB();
    const Customer = require('./lib/models/Customer');
    const Payment  = require('./lib/models/Payment');
    requireAuth(event.headers);

    if (method==='GET' && !subPath) {
      // Fetch all available customers to "feed" the page directly
      const allCustomers = await Customer.find({}).select('name phone address').sort({ name: 1 }).lean();
      console.log(`[payments] DB Status: Found ${allCustomers.length} valid customers in the database.`);
      allCustomers.forEach(c => console.log(` -> DB Customer: ${c.name} (ID: ${c._id})`));

      const filter = {};
      if (qs.method) filter.method = qs.method;
      const items = await Payment.find(filter).populate('customer','name').sort({ date:-1 }).limit(500).lean();
      
      const data = items.map(i => {
        if (i.customer && typeof i.customer === 'object') return i;
        return { ...i, customer: { name: 'Unknown Customer' } };
      });

      console.log(`[payments] Found ${data.length} payments. Data verified.`);

      const filtered = qs.search 
        ? data.filter(p => (p.customer?.name || '').toLowerCase().includes(qs.search.toLowerCase())) 
        : data;
      return ok({ success:true, data: filtered, customers: allCustomers });
    }

    if (method==='GET' && subPath==='stats') {
      const total = await Payment.countDocuments();
      const agg = await Payment.aggregate([{ $group:{ _id:null, totalRevenue:{ $sum:'$amount' } } }]);
      return ok({ success:true, data:{ total, totalRevenue: agg[0]?.totalRevenue||0 } });
    }

    if (method==='GET' && subPath) {
      const item = await Payment.findById(subPath).populate('customer');
      if (!item) return err('Not found', 404);
      return ok({ success:true, data:item });
    }

    if (method==='POST') {
      const customerId = body.customer || body.customer_id;
      if (!customerId) return err('customer is required for payments', 400);
      if (!mongoose.Types.ObjectId.isValid(customerId)) return err('Invalid customer ID format', 400);
      
      const cust = await Customer.findById(customerId);
      if (!cust) return err('Customer does not exist in database', 404);

      const item = await Payment.create(sanitize(body));
      return ok({ success:true, data:item }, 201);
    }

    if (method==='PUT' && subPath) {
      const item = await Payment.findByIdAndUpdate(subPath, sanitize(body), { new:true, runValidators:true });
      if (!item) return err('Not found', 404);
      return ok({ success:true, data:item });
    }

    if (method==='DELETE' && subPath) {
      await Payment.findByIdAndDelete(subPath);
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
