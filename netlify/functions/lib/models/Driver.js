const mongoose = require('mongoose');
const driverSchema = new mongoose.Schema({
  full_name:           { type: String, required: true, trim: true },
  phone:               { type: String, trim: true, default: '' },
  license_number:      { type: String, trim: true, default: '' },
  assigned_vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  status:              { type: String, enum: ['Available','On Delivery','Off Duty'], default: 'Available' },
  notes:               { type: String, default: '' },
}, { timestamps: true });
module.exports = mongoose.models.Driver || mongoose.model('Driver', driverSchema);
