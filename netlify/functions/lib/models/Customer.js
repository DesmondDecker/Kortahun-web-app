// netlify/functions/lib/models/Customer.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:            { type: String, required: true, trim: true },
  address:          { type: String, required: true, trim: true },
  services:         { type: [String], enum: ['water', 'sewage'], default: [] },
  status:           { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  meterNumber:      { type: String, unique: true, sparse: true, trim: true },
  connectionDate:   { type: Date, default: Date.now },
  emergencyContact: { type: String, default: '' },
  emergencyPhone:   { type: String, default: '' },
  notes:            { type: String, default: '' },
  lastUpdated:      { type: Date, default: Date.now },
}, { timestamps: true });

customerSchema.index({ name: 'text', email: 'text', phone: 'text', address: 'text' });
customerSchema.index({ status: 1 });
customerSchema.index({ services: 1 });

module.exports = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
