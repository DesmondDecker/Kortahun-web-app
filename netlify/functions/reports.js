const connectDB  = require('./lib/mongodb');
const Delivery   = require('./lib/models/Delivery');
const Customer   = require('./lib/models/Customer');
const { requireAuth, ok, err, cors } = require('./lib/auth');

function sub(event) { return (event.path||'').replace(/.*\/reports\/?/,'').replace(/^\/+|\/+$/g,''); }

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();
  const method = event.httpMethod, subPath = sub(event);
  const qs = event.queryStringParameters || {};
  try {
    await connectDB();
    requireAuth(event.headers);

    const dateFilter = {};
    if (qs.date_from) dateFilter.$gte = new Date(qs.date_from);
    if (qs.date_to)   dateFilter.$lte = new Date(qs.date_to + 'T23:59:59');

    if (method==='GET' && subPath==='summary') {
      const deliveryFilter = Object.keys(dateFilter).length ? { delivery_date: dateFilter } : {};
      const [totalRevAgg, totalDel, outstanding, activeCustomers, serviceMix] = await Promise.all([
        Delivery.aggregate([{ $match: deliveryFilter }, { $group:{ _id:null, total:{ $sum:'$total_amount' } } }]),
        Delivery.countDocuments(deliveryFilter),
        Delivery.aggregate([{ $match: deliveryFilter }, { $group:{ _id:null, total:{ $sum:'$outstanding_balance' } } }]),
        Customer.countDocuments({ status:'active' }),
        Delivery.aggregate([{ $match: deliveryFilter }, { $group:{ _id:'$service_type', count:{ $sum:1 } } }]),
      ]);
      return ok({ success:true, data:{
        totalRevenue: totalRevAgg[0]?.total||0,
        totalDeliveries: totalDel,
        outstanding: outstanding[0]?.total||0,
        activeCustomers,
        serviceMix: serviceMix.map(s=>({ service:s._id, count:s.count })),
      }});
    }

    if (method==='GET' && subPath==='revenue') {
      const filter = Object.keys(dateFilter).length ? { delivery_date: dateFilter } : {};
      const agg = await Delivery.aggregate([
        { $match: filter },
        { $group:{ _id:{ $month:'$delivery_date' }, revenue:{ $sum:'$total_amount' }, count:{ $sum:1 } } },
        { $sort:{ '_id':1 } },
      ]);
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return ok({ success:true, data: agg.map(m=>({ month: MONTHS[(m._id||1)-1], revenue: m.revenue, count: m.count })) });
    }

    if (method==='GET' && subPath==='deliveries') {
      const filter = Object.keys(dateFilter).length ? { delivery_date: dateFilter } : {};
      const agg = await Delivery.aggregate([
        { $match: filter },
        { $group:{ _id:{ $dateToString:{ format:'%Y-%m-%d', date:'$delivery_date' } }, count:{ $sum:1 } } },
        { $sort:{ '_id':1 } },
      ]);
      return ok({ success:true, data: agg.map(d=>({ date:d._id, count:d.count })) });
    }

    return err('Not found',404);
  } catch(e) { return err(e.message, e.status||500); }
};
