const mongoose = require('mongoose');
const expenseSchema = new mongoose.Schema({
  category:     { type: String, enum: ['Fuel','Maintenance','Repairs','Salaries','Tools & Equipment','Office Supplies','Vehicle Insurance','Permits & Licenses','Other'], default: 'Fuel' },
  description:  { type: String, required: true, trim: true },
  amount:       { type: Number, required: true, min: 0 },
  vendor:       { type: String, default: '', trim: true },
  vehicle_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  driver_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Driver',  default: null },
  expense_date: { type: Date, default: Date.now },
  receipt_ref:  { type: String, default: '' },
  notes:        { type: String, default: '' },
}, { timestamps: true });
expenseSchema.index({ category: 1, expense_date: -1 });
module.exports = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
