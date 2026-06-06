const connectDB = require('./lib/mongodb');
const Bill = require('./lib/models/Bill'); // Use Bill as base or create Note model
const Customer = require('./lib/models/Customer');
const { requireAuth, ok, err, cors } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();
  const method = event.httpMethod;
  
  try {
    await connectDB();
    const user = requireAuth(event.headers);

    // Generate Delivery Note from an existing Bill/Order
    if (method === 'GET') {
      const billId = (event.queryStringParameters || {}).billId;
      if (!billId) return err("billId query param required", 400);
      const bill = await Bill.findById(billId).populate('customer');
      
      if (!bill) return err('Reference bill not found', 404);

      // Return data structured specifically for a Delivery Note PDF
      return ok({
        success: true,
        data: {
          noteNumber: `DN-${bill.billNumber || bill._id.toString().slice(-6).toUpperCase()}`,
          date: new Date(),
          customer: bill.customer,
          items: bill.lineItems.map(i => ({ 
            description: i.description, 
            liters: i.liters,
            delivered: false // For the driver to check off
          })),
          trips: bill.trips,
          liters: bill.liters,
          recipient: '', // Placeholder for signature
          driver: user.username
        }
      });
    }

    return err('Endpoint not found', 404);
  } catch (e) {
    if (e.status === 401) return err(e.message, 401);
    if (e.message.includes('MONGO_URI')) return err('Database configuration missing', 500);
    if (e.name === 'MongooseError' && e.message.includes('buffering')) return err('Database connection timeout', 504);
    console.error('[delivery-notes]', e);
    return err('Server error', 500);
  }
};