const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
  customer:  { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  delivery:  { type: mongoose.Schema.Types.ObjectId, ref: 'Delivery', default: null },
  amount:    { type: Number, required: true, min: 0 },
  method:    { type: String, enum: ['Cash','Bank Transfer','Mobile Money'], default: 'Cash' },
  date:      { type: Date, default: Date.now },
  notes:     { type: String, default: '' },
}, { timestamps: true });
paymentSchema.index({ customer: 1, date: -1 });
module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
