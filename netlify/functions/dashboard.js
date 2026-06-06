const connectDB  = require('./lib/mongodb');
const Customer   = require('./lib/models/Customer');
const Bill       = require('./lib/models/Bill');
const Appointment = require('./lib/models/Appointment');
const Delivery   = require('./lib/models/Delivery');
const Payment    = require('./lib/models/Payment');
const Expense    = require('./lib/models/Expense');
const Vehicle    = require('./lib/models/Vehicle');
const Driver     = require('./lib/models/Driver');
const { requireAuth, ok, err, cors } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();
  try {
    await connectDB();
    requireAuth(event.headers);

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30);

    const [
      totalCustomers, activeCustomers,
      totalBills, pendingBills, paidBills,
      totalDeliveries, recentDeliveries,
      totalVehicles, activeVehicles,
      totalDrivers, availableDrivers,
      revAgg, outstandingAgg, expAgg,
      recentBillsList, upcomingAppts,
      monthlyRevenue, statusBreakdown,
    ] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ status:'active' }),
      Bill.countDocuments(),
      Bill.countDocuments({ status:{ $in:['Pending','Overdue'] } }),
      Bill.countDocuments({ status:'Paid' }),
      Delivery.countDocuments(),
      Delivery.countDocuments({ delivery_date:{ $gte: thirtyDaysAgo } }),
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ status:'Active' }),
      Driver.countDocuments(),
      Driver.countDocuments({ status:'Available' }),
      Bill.aggregate([{ $match:{ status:'Paid' } }, { $group:{ _id:null, total:{ $sum:'$total' } } }]),
      Bill.aggregate([{ $match:{ status:{ $in:['Pending','Overdue'] } } }, { $group:{ _id:null, total:{ $sum:'$total' } } }]),
      Expense.aggregate([{ $match:{ expense_date:{ $gte: thirtyDaysAgo } } }, { $group:{ _id:null, total:{ $sum:'$amount' } } }]),
      Bill.find().populate('customer','name').sort({ createdAt:-1 }).limit(8),
      Appointment.find({ date:{ $gte: new Date() }, status:{ $nin:['cancelled','completed'] } }).sort({ date:1 }).limit(5),
      Bill.aggregate([
        { $group:{ _id:{ $month:'$createdAt' }, revenue:{ $sum:'$total' }, count:{ $sum:1 } } },
        { $sort:{ '_id':1 } }, { $limit:12 },
      ]),
      Bill.aggregate([
        { $group:{ _id:'$status', total:{ $sum:'$total' }, count:{ $sum:1 } } },
      ]),
    ]);

    return ok({ success:true, data:{
      stats:{
        totalCustomers, activeCustomers,
        totalBills, pendingBills, paidBills,
        totalDeliveries, recentDeliveries,
        totalVehicles, activeVehicles,
        totalDrivers, availableDrivers,
        totalRevenue:    revAgg[0]?.total        || 0,
        totalOutstanding: outstandingAgg[0]?.total || 0,
        recentExpenses:  expAgg[0]?.total         || 0,
      },
      recentBills:  recentBillsList,
      upcomingAppointments: upcomingAppts,
      charts: { monthlyRevenue, statusBreakdown },
    }});
  } catch(e) { return err(e.message, e.status||500); }
};
