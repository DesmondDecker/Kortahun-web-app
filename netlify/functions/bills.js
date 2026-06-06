// netlify/functions/bills.js
const connectDB  = require('./lib/mongodb');
const Bill       = require('./lib/models/Bill');
const Customer   = require('./lib/models/Customer');
const mongoose   = require('mongoose');
const { requireAuth, checkRole, logAction, ok, err, cors } = require('./lib/auth');

function getSubPath(event) {
  return (event.path || '')
    .replace(/.*\/bills\/?/, '')
    .replace(/^\/+|\/+$/g, ''); // Remove leading and trailing slashes
}

const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Generates a unique bill number based on the status and a daily sequence.
 */
async function generateBillNumber(status) {
  const prefix = status === 'Proforma' ? 'PRO' : 'INV';
  const date = new Date();
  const dateStr = date.getFullYear().toString().slice(-2) + 
                  (date.getMonth() + 1).toString().padStart(2, '0') + 
                  date.getDate().toString().padStart(2, '0');
  
  // Get count of bills created today for sequence
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  let count = 0;
  try {
    count = await Bill.countDocuments({ createdAt: { $gte: startOfDay } });
  } catch (e) {
    console.error('[bills] Sequence generation failed', e);
  }
  
  return `${prefix}-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
}

async function processBillData(data) {
  const d = { ...data };

  // Robust Customer ID extraction and validation to prevent CastError/Invalid ID format
  if (d.customer) {
    const cid = typeof d.customer === 'object' ? d.customer._id : d.customer;
    if (typeof cid === 'string' && mongoose.Types.ObjectId.isValid(cid.trim())) {
      d.customer = cid.trim();
    } else {
      d.customer = null;
    }
  } else {
    d.customer = null;
  }

  if (d.lineItems && d.lineItems.length > 0) {
    d.lineItems = d.lineItems.map(item => {
      const trps  = parseFloat(item.trips || item.quantity) || 1;
      const ltrs  = parseFloat(item.liters) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      if (!item.description?.trim()) throw Object.assign(new Error('Line item description is required'), { status: 400 });
      return { description: item.description.trim(), trips: trps, liters: ltrs, unitPrice: price, totalPrice: round(trps * price) };
    });
  } else {
    d.lineItems = [{ description: d.description || 'Water Supply', trips: d.trips || 1, unitPrice: 0, totalPrice: 0 }];
  }
  ['additionalCharges','discount','tax'].forEach(k => {
    if (d[k] !== undefined) { d[k] = round(parseFloat(d[k]) || 0); }
  });
  ['bankName', 'accountName', 'accountNumber', 'swiftCode'].forEach(k => {
    if (d[k]) d[k] = d[k].trim();
  });
  // Sum trips from line items if not explicitly provided
  if (!d.trips && d.lineItems) {
    d.trips = d.lineItems.reduce((acc, item) => acc + (item.trips || 0), 0);
  }
  // Also sum total liters from line items for the bill record
  if (!d.liters && d.lineItems) {
    d.liters = d.lineItems.reduce((acc, item) => acc + (item.liters || 0), 0);
  }
  d.trips = parseInt(d.trips) || 1;

  // Auto-generate bill number if missing or draft
  if (!d.billNumber || d.billNumber === 'DRAFT') {
    d.billNumber = await generateBillNumber(d.status);
  }

  delete d.subtotal; delete d.total; // let pre-save recalculate
  return d;
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

    // GET /api/bills/customers/all  — dropdown list of customers
    if (method === 'GET' && subPath === 'customers/all') {
      const customers = await Customer.find({}).select('name phone email address').sort({ name: 1 });
      return ok({ success: true, data: customers });
    }

    // GET /api/bills/analytics/summary
    if (method === 'GET' && subPath === 'analytics/summary') {
      const year = new Date().getFullYear();
      
      const [totalsResult, statusBreakdown, monthlyRevenue] = await Promise.all([
        Bill.aggregate([{
          $group: {
            _id: null,
            totalBills:   { $sum: 1 },
            totalRevenue: { $sum: '$total' },
            avgBill:      { $avg: '$total' },
            totalTrips:   { $sum: '$trips' },
            totalLiters:  { $sum: '$liters' },
          }
        }]),
        Bill.aggregate([{
          $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$total' } }
        }]),
        Bill.aggregate([
          { $match: { createdAt: { $gte: new Date(year,0,1), $lt: new Date(year+1,0,1) }, status: 'Paid' } },
          { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$total' }, count: { $sum: 1 } } },
          { $sort: { '_id': 1 } },
        ])
      ]);

      const totals = totalsResult[0];
      const summaryTotals = totals || {
        totalBills: 0,
        totalRevenue: 0,
        avgBill: 0,
        totalTrips: 0,
        totalLiters: 0,
      };
      return ok({ success: true, data: { totals: summaryTotals, statusBreakdown, monthlyRevenue } });
    }

    // GET /api/bills/overdue/all
    if (method === 'GET' && subPath === 'overdue/all') {
      const bills = await Bill.find({ status: 'Pending', dueDate: { $lt: new Date() } })
        .populate('customer', 'name phone email address').sort({ dueDate: 1 });
      return ok({ success: true, data: bills });
    }

    // GET /api/bills/export/csv
    if (method === 'GET' && subPath === 'export/csv') {
      const bills = await Bill.find({}).populate('customer','name email').sort({ createdAt: -1 });
      const rows  = [['Bill Number','Customer','Status','Trips','Liters','Total (SLE)','Bank','Account #','Created']];
      bills.forEach(b => rows.push([
        b.billNumber || 'DRAFT',
        b.customer?.name || '',
        b.status,
        b.trips || 0,
        b.liters || 0,
        b.total || 0,
        b.bankName || '',
        b.accountNumber || '',
        b.createdAt?.toISOString().split('T')[0] || '',
      ]));
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'text/csv', 
          'Content-Disposition': 'attachment; filename="bills.csv"', 
          'Access-Control-Allow-Origin': process.env.URL || '*' 
        },
        body: '\uFEFF' + csv,
      };
    }

    // GET /api/bills/customer/:customerId/bills
    if (method === 'GET' && subPath.startsWith('customer/') && subPath.endsWith('/bills')) {
      const cid = subPath.split('/')[1];
      if (!mongoose.Types.ObjectId.isValid(cid)) return err('Invalid customer ID', 400);
      const customer = await Customer.findById(cid);
      if (!customer) return err('Customer not found', 404);
      const bills = await Bill.find({ customer: cid }).populate('customer','name phone email').sort({ createdAt: -1 });
      return ok({ success: true, data: { customer, bills, count: bills.length } });
    }

    // GET /api/bills/customer/:customerId/stats
    if (method === 'GET' && subPath.startsWith('customer/') && subPath.endsWith('/stats')) {
      const cid = subPath.split('/')[1];
      if (!mongoose.Types.ObjectId.isValid(cid)) return err('Invalid customer ID', 400);
      const customer = await Customer.findById(cid);
      if (!customer) return err('Customer not found', 404);
      const bills = await Bill.find({ customer: cid });
      const stats = {
        totalBills:    bills.length,
        totalAmount:   bills.reduce((s,b) => s+(b.total||0), 0),
        paidBills:     bills.filter(b => b.status==='Paid').length,
        pendingBills:  bills.filter(b => b.status==='Pending').length,
        overdueBills:  bills.filter(b => b.status==='Overdue').length,
        paidAmount:    bills.filter(b=>b.status==='Paid').reduce((s,b)=>s+(b.total||0),0),
        pendingAmount: bills.filter(b=>['Pending','Overdue'].includes(b.status)).reduce((s,b)=>s+(b.total||0),0),
      };
      return ok({ success: true, data: { customer, stats } });
    }

    // POST /api/bills/customer/:customerId/create
    if (method === 'POST' && subPath.startsWith('customer/') && subPath.endsWith('/create')) {
      const cid = subPath.split('/')[1];
      if (!mongoose.Types.ObjectId.isValid(cid)) return err('Invalid customer ID', 400);
      const customer = await Customer.findById(cid);
      if (!customer) return err('Customer not found', 404);
      const data = await processBillData({ ...body, customer: cid, createdBy: user.username });
      const bill = await Bill.create(data);
      const populated = await Bill.findById(bill._id).populate('customer','name phone email address');
      await logAction(user.username, 'CREATE', 'Bill', bill._id, { type: data.status });
      return ok({ success: true, data: populated, message: `Bill created for ${customer.name}` }, 201);
    }

    // DELETE /api/bills/customer/:customerId/folder
    if (method === 'DELETE' && subPath.startsWith('customer/') && subPath.endsWith('/folder')) {
      checkRole(user, ['admin']);
      const cid = subPath.split('/')[1];
      if (!mongoose.Types.ObjectId.isValid(cid)) return err('Invalid customer ID', 400);
      const customer = await Customer.findById(cid);
      if (!customer) return err('Customer not found', 404);
      const result = await Bill.deleteMany({ customer: cid });
      await logAction(user.username, 'BULK_DELETE_CUSTOMER_BILLS', 'Bill', cid);
      return ok({ success: true, message: `Deleted ${result.deletedCount} bills for ${customer.name}`, deletedCount: result.deletedCount });
    }

    // POST /api/bills/bulk/delete
    if (method === 'POST' && subPath === 'bulk/delete') {
      const { billIds } = body;
      if (!Array.isArray(billIds) || !billIds.length) return err('billIds array required', 400);
      const invalid = billIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalid.length) return err('Invalid bill IDs', 400);
      const result = await Bill.deleteMany({ _id: { $in: billIds } });
      await logAction(user.username, 'BULK_DELETE', 'Bill', null, { count: result.deletedCount });
      return ok({ success: true, deletedCount: result.deletedCount });
    }

    // POST /api/bills/bulk/update-status
    if (method === 'POST' && subPath === 'bulk/update-status') {
      const { billIds, status } = body;
      if (!Array.isArray(billIds) || !billIds.length) return err('billIds array required', 400);
      if (!['Pending','Paid','Overdue','Cancelled','Proforma'].includes(status)) return err('Invalid status', 400);
      const result = await Bill.updateMany({ _id: { $in: billIds } }, { $set: { status } });
      await logAction(user.username, 'BULK_STATUS_UPDATE', 'Bill', null, { status, count: result.modifiedCount });
      return ok({ success: true, modifiedCount: result.modifiedCount });
    }

    // GET /api/bills/:id/export/pdf  — simplified PDF export as JSON summary
    if (method === 'GET' && subPath.match(/^[a-f0-9]{24}\/export\/pdf$/)) {
      const id = subPath.split('/')[0];
      const bill = await Bill.findById(id).populate('customer','name phone email address');
      if (!bill) return err('Bill not found', 404);
      // Return bill data for frontend to render PDF
      return ok({ success: true, data: bill, message: 'Use frontend PDF library to render this data' });
    }

    // Safety: Handle explicit "undefined" string sent from frontend
    if (subPath === 'undefined') {
      return err('Invalid ID format', 400);
    }

    // GET /api/bills/:id
    if (method === 'GET' && subPath && mongoose.Types.ObjectId.isValid(subPath)) {
      const bill = await Bill.findById(subPath).populate('customer','name phone email address');
      if (!bill) return err('Bill not found', 404);
      return ok({ success: true, data: bill });
    }

    // PUT /api/bills/:id
    if (method === 'PUT' && subPath && mongoose.Types.ObjectId.isValid(subPath)) {
      const existing = await Bill.findById(subPath);
      if (!existing) return err('Bill not found', 404);
      const data = await processBillData(body);
      
      // Log specific financial changes for Audit Logs
      if (data.status !== existing.status) {
        await logAction(user.username, 'STATUS_CHANGE', 'Bill', subPath, { from: existing.status, to: data.status });
      }
      if (data.transactionId && data.transactionId !== existing.transactionId) {
        await logAction(user.username, 'PAYMENT_RECORDED', 'Bill', subPath, { ref: data.transactionId });
      }

      const bill = await Bill.findByIdAndUpdate(subPath, data, { new: true, runValidators: true })
        .populate('customer','name phone email address');
      await logAction(user.username, 'UPDATE', 'Bill', subPath);
      return ok({ success: true, data: bill, message: 'Bill updated' });
    }

    // DELETE /api/bills/:id
    if (method === 'DELETE' && subPath && mongoose.Types.ObjectId.isValid(subPath)) {
      const bill = await Bill.findByIdAndDelete(subPath);
      if (!bill) return err('Bill not found', 404);
      await logAction(user.username, 'DELETE', 'Bill', subPath);
      return ok({ success: true, message: 'Bill deleted' });
    }

    // GET /api/bills  (list)
    if (method === 'GET' && !subPath) {
      const { page=1, limit=50, status, customerId } = qs;
      const filter = {};
      if (status && status !== 'all') filter.status = status;
      if (customerId) filter.customer = customerId;
      const [bills, total] = await Promise.all([
        Bill.find(filter).populate('customer','name phone email address').sort({ createdAt: -1 })
          .skip((+page-1)*(+limit)).limit(+limit),
        Bill.countDocuments(filter),
      ]);
      return ok({ success: true, data: bills, pagination: { total, page: +page, limit: +limit } });
    }

    // POST /api/bills  (create general)
    if (method === 'POST' && !subPath) {
      const data = await processBillData({ ...body, createdBy: user.username });
      if (!data.customer) return err('customer is required', 400);
      if (!mongoose.Types.ObjectId.isValid(data.customer)) return err('Invalid customer ID', 400);
      const customer = await Customer.findById(data.customer);
      if (!customer) return err('Customer not found', 404);
      const bill = await Bill.create(data);
      const populated = await Bill.findById(bill._id).populate('customer','name phone email address');
      return ok({ success: true, data: populated }, 201);
    }

    return err('Endpoint not found', 404);
  } catch (e) {
    if (e.status === 401) return err(e.message, 401);
    if (e.status === 400) return err(e.message, 400);
    if (e.name === 'ValidationError') return err('Validation error', 400, { errors: Object.values(e.errors).map(x=>x.message) });
    if (e.code === 11000) return err('Duplicate entry', 400);
    if (e.name === 'CastError') {
      const field = e.path === '_id' ? 'Bill ID' : (e.path === 'customer' ? 'Customer selection' : e.path);
      return err(`Invalid ${field} format`, 400);
    }
    console.error('[bills]', e);
    return err('Server error', 500);
  }
};
