const mongoose = require('mongoose');
const vehicleSchema = new mongoose.Schema({
  vehicle_number:     { type: String, required: true, unique: true, trim: true },
  vehicle_type:       { type: String, enum: ['Water Tanker','Sewage Truck','Mini Tanker','Flatbed','Other'], default: 'Water Tanker' },
  capacity_litres:    { type: Number, default: 5000 },
  fuel_type:          { type: String, enum: ['Diesel','Petrol','CNG','Electric'], default: 'Diesel' },
  assigned_driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  status:             { type: String, enum: ['Active','Inactive','Under Service'], default: 'Active' },
  notes:              { type: String, default: '' },
}, { timestamps: true });
module.exports = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);
