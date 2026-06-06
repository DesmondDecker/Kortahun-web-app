const mongoose = require('mongoose');
const deliverySchema = new mongoose.Schema({
  customer:            { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  vehicle:             { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  driver:              { type: mongoose.Schema.Types.ObjectId, ref: 'Driver',  default: null },
  service_type:        { type: String, enum: ['Water Supply','Sewage Disposal'], default: 'Water Supply' },
  quantity_litres:     { type: Number, default: 5000 },
  unit_price:          { type: Number, default: 1700 },
  trips:               { type: Number, default: 1 },
  total_amount:        { type: Number, default: 0 },
  cash_received:       { type: Number, default: 0 },
  outstanding_balance: { type: Number, default: 0 },
  payment_status:      { type: String, enum: ['Unpaid','Partial','Paid'], default: 'Unpaid' },
  delivery_date:       { type: Date, default: Date.now },
  notes:               { type: String, default: '' },
}, { timestamps: true });
deliverySchema.index({ customer: 1, delivery_date: -1 });
deliverySchema.index({ payment_status: 1 });
module.exports = mongoose.models.Delivery || mongoose.model('Delivery', deliverySchema);
