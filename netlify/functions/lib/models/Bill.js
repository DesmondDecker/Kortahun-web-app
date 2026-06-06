const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
  billNumber: { 
    type: String, 
    unique: true, 
    required: true 
  },
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer',
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Proforma', 'Pending', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Pending' 
  },
  lineItems: [{
    description: { type: String, required: true },
    trips: { type: Number, default: 0 },
    liters: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 }
  }],
  trips: { type: Number, default: 0 },
  liters: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  additionalCharges: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paymentMethod: { 
    type: String, 
    enum: ['Cash', 'Card', 'Bank Transfer', 'Mobile Money', 'Check', 'Credit'],
    default: 'Cash' 
  },
  dueDate: Date,
  paymentDate: Date,
  transactionId: String,
  notes: String,
  createdBy: String
}, { timestamps: true });

// Calculate subtotal and total before saving
BillSchema.pre('save', function(next) {
  this.subtotal = this.lineItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  this.total = (this.subtotal || 0) + (this.additionalCharges || 0) - (this.discount || 0) + (this.tax || 0);
  next();
});

module.exports = mongoose.models.Bill || mongoose.model('Bill', BillSchema);