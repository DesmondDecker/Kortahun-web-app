const mongoose = require('mongoose');
const { requireAuth, ok, err, cors } = require('./lib/auth');
const connectDB = require('./lib/mongodb');

function sub(event) { return (event.path||'').replace(/.*\/deliveries\/?/,'').replace(/^\/+|\/+$/g,''); }

function sanitize(d) {
  const o = { ...d };
  if (!o.customer || o.customer === '' || o.customer === 'undefined' || o.customer === 'null' || o.customer === null) {
    o.customer = null;
  } else {
    const cid = typeof o.customer === 'object' ? o.customer._id : o.customer;
    if (typeof cid === 'string' && mongoose.Types.ObjectId.isValid(cid.trim())) {
      o.customer = cid.trim();
    } else if (!mongoose.Types.ObjectId.isValid(cid)) {
      o.customer = null;
    }
  }
  if (o.vehicle === '') o.vehicle = null;
  if (o.driver  === '') o.driver  = null;
  // Compute financials
  const total       = (Number(o.unit_price)||0) * (Number(o.trips)||1);
  const outstanding = Math.max(0, total - (Number(o.cash_received)||0));
  o.total_amount        = total;
  o.outstanding_balance = outstanding;
  if ((Number(o.cash_received)||0) >= total && total > 0) o.payment_status = 'Paid';
  else if ((Number(o.cash_received)||0) > 0) o.payment_status = 'Partial';
  else o.payment_status = o.payment_status || 'Unpaid';
  return o;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();
  const method = event.httpMethod, subPath = sub(event);
  const qs = event.queryStringParameters || {};
  let body = {}; try { body = JSON.parse(event.body||'{}'); } catch {}

  try {
    await connectDB();
    // Ensure models are registered inside the handler context
    const Customer = require('./lib/models/Customer');
    const Vehicle  = require('./lib/models/Vehicle');
    const Driver   = require('./lib/models/Driver');
    const Delivery = require('./lib/models/Delivery');
    requireAuth(event.headers);

    // GET list
    if (method==='GET' && !subPath) {
      // Mega-Feed: Fetch all required dropdown data in parallel with the list
      const [allCustomers, allVehicles, allDrivers] = await Promise.all([
        Customer.find({ status: 'active' }).select('name phone').sort({ name: 1 }).lean(),
        Vehicle.find({ status: 'Active' }).select('vehicle_number vehicle_type').lean(),
        Driver.find({ status: 'Available' }).select('full_name').lean()
      ]);

      console.log(`[deliveries] Feed: ${allCustomers.length} Cust, ${allVehicles.length} Veh, ${allDrivers.length} Drv`);

      const filter = {};
      if (qs.customer_id)    filter.customer       = qs.customer_id;
      if (qs.payment_status) filter.payment_status = qs.payment_status;
      const items = await Delivery.find(filter)
        .populate('customer','name phone address')
        .populate('vehicle','vehicle_number vehicle_type')
        .populate('driver','full_name')
        .sort({ delivery_date:-1 })
        .limit(500)
        .lean();

      // Filter out deliveries where customer population failed (orphans)
      const validDeliveries = items.filter(i => i.customer && typeof i.customer === 'object');

      // Log to terminal to verify population and filtering
      const orphanCount = items.length - validDeliveries.length;
      console.log(`[deliveries] Records: Found ${items.length} total deliveries. Valid: ${validDeliveries.length}, Orphans filtered out: ${orphanCount}`);
      
      // Log details of filtered orphans
      items.filter(i => !(i.customer && typeof i.customer === 'object')).forEach(i => {
        console.warn(` -> ORPHAN FILTERED: Delivery ${i._id} -> Broken Ref ID: ${i.customer || 'MISSING'}`);
      });

      const filtered = qs.search
        ? validDeliveries.filter(d => (d.customer?.name || '').toLowerCase().includes(qs.search.toLowerCase()))
        : validDeliveries;

      return ok({ success:true, data: filtered, count: filtered.length, customers: allCustomers, vehicles: allVehicles, drivers: allDrivers });
    }

    // GET stats
    if (method==='GET' && subPath==='stats') {
      const [total, paid, unpaid, partial] = await Promise.all([
        Delivery.countDocuments(),
        Delivery.countDocuments({ payment_status:'Paid' }),
        Delivery.countDocuments({ payment_status:'Unpaid' }),
        Delivery.countDocuments({ payment_status:'Partial' }),
      ]);
      const revAgg = await Delivery.aggregate([{ $group:{ _id:null, total:{ $sum:'$total_amount' }, outstanding:{ $sum:'$outstanding_balance' } } }]);
      return ok({ success:true, data:{ total, paid, unpaid, partial, totalRevenue: revAgg[0]?.total||0, totalOutstanding: revAgg[0]?.outstanding||0 } });
    }

    // GET by id
    if (method==='GET' && subPath && !subPath.includes('/')) {
      const item = await Delivery.findById(subPath).populate('customer').populate('vehicle').populate('driver');
      if (!item) return err('Not found', 404);
      return ok({ success:true, data:item });
    }

    // PATCH status
    if (method==='PATCH' && subPath.endsWith('/status')) {
      const id = subPath.replace('/status','');
      const validStatuses = ['Unpaid','Partial','Paid'];
      if (!validStatuses.includes(body.status)) return err(`Status must be one of: ${validStatuses.join(', ')}`, 400);
      const item = await Delivery.findByIdAndUpdate(id, { payment_status: body.status }, { new:true });
      if (!item) return err('Not found', 404);
      return ok({ success:true, data:item });
    }

    // POST create
    if (method==='POST') {
      if (!body.customer) return err('Customer is required. Please select a valid customer.', 400);
      if (!mongoose.Types.ObjectId.isValid(body.customer)) return err('Invalid Customer ID format', 400);
      
      const custExists = await Customer.findById(body.customer);
      if (!custExists) return err(`Customer with ID ${body.customer} does not exist in the database.`, 404);

      const item = await Delivery.create(sanitize(body));
      return ok({ success:true, data:item }, 201);
    }

    // PUT update
    if (method==='PUT' && subPath && !subPath.includes('/')) {
      if (body.customer === undefined) return err('customer field must be present', 400);
      
      if (body.customer) {
        if (!mongoose.Types.ObjectId.isValid(body.customer)) return err('Invalid Customer ID format', 400);
        const custExists = await Customer.findById(body.customer);
        if (!custExists) return err(`Customer with ID ${body.customer} does not exist.`, 404);
      }

      const item = await Delivery.findByIdAndUpdate(subPath, sanitize(body), { new:true, runValidators:true });
      if (!item) return err('Not found', 404);
      return ok({ success:true, data:item });
    }

    // DELETE
    if (method==='DELETE' && subPath && !subPath.includes('/')) {
      await Delivery.findByIdAndDelete(subPath);
      return ok({ success:true });
    }

    return err('Not found', 404);
  } catch(e) {
    if (e.name === 'ValidationError') return err('Validation: ' + Object.values(e.errors).map(x=>x.message).join(', '), 400);
    if (e.name === 'CastError') return err('Invalid ID', 400);
    if (e.status === 401) return err(e.message, 401);
    console.error('[deliveries]', e);
    return err(e.message || 'Server error', e.status || 500);
  }
};
