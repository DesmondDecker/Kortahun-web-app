const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  customerName:  { type: String, required: true, trim: true },
  customerPhone: { type: String, required: true, trim: true },
  service:       { type: String, required: true, trim: true },
  date:          { type: Date,   required: true },
  time:          { type: String, required: true },
  status:        { type: String, enum: ['scheduled','in-progress','completed','cancelled','pending','confirmed'], default: 'scheduled' },
  address:       { type: String, default: '' },
  notes:         { type: String, default: '' },
  assignedTo:    { type: String, default: 'Unassigned' },
  technician:    { type: String, default: '' },
  priority:      { type: String, enum: ['low','medium','high'], default: 'medium' },
  totalCost:     { type: Number, default: 0 },
}, { timestamps: true });

appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ customerPhone: 1 });

module.exports = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
