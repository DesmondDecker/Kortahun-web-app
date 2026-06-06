require('./netlify/functions/lib/models/Customer');
require('./netlify/functions/lib/models/Vehicle');
require('./netlify/functions/lib/models/Driver');
const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');

if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGO_URI);
}

const app = express();
app.use(express.json());

const DeliverySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  unit_price: Number,
  trips: Number,
  cash_received: Number,
  total_amount: Number,
  outstanding_balance: Number,
  payment_status: String,
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }
}, { timestamps: true });

const Delivery = mongoose.models.Delivery || mongoose.model('Delivery', DeliverySchema);

// Fix 2: Logic to auto-compute totals and payment status
const prepareDeliveryData = (data) => {
  const unitPrice = parseFloat(data.unit_price) || 0;
  const trips = parseInt(data.trips) || 0;
  const cash = parseFloat(data.cash_received) || 0;

  const totalAmount = unitPrice * trips;
  const outstanding = totalAmount - cash;
  
  let status = 'Unpaid';
  if (outstanding <= 0) status = 'Paid';
  else if (cash > 0) status = 'Partial';

  return {
    ...data,
    total_amount: totalAmount,
    outstanding_balance: outstanding,
    payment_status: status,
    // Convert empty strings or invalid IDs to null for ObjectId fields to prevent CastErrors
    customer: (() => { // Robust customer ID handling
      const cid = typeof data.customer === 'object' ? data.customer._id : data.customer;
      const val = (typeof cid === 'string') ? cid.trim() : cid; // Trim whitespace
      if (val && val !== '' && val !== 'undefined' && val !== 'null' && mongoose.Types.ObjectId.isValid(val)) { // Validate against common invalid strings
        return val; // Return valid ObjectId string
      }
      return null; // Return null for invalid or empty IDs
    })(),
    vehicle: data.vehicle === '' ? null : data.vehicle,
    driver: data.driver === '' ? null : data.driver
  };
};

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    if (!req.body.customer) return res.status(400).json({ error: 'Customer is required' });
    if (!mongoose.Types.ObjectId.isValid(req.body.customer)) return res.status(400).json({ error: 'Invalid Customer ID' });
    
    const cust = await mongoose.model('Customer').findById(req.body.customer);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    const data = prepareDeliveryData(req.body);
    const delivery = new Delivery(data);
    await delivery.save();
    res.status(201).json(delivery);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use('/.netlify/functions/deliveries', router);
exports.handler = serverless(app);