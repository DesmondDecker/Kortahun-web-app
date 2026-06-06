const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: String, required: true },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: Object },
  timestamp: { type: Date, default: Date.now }
});

// Index for faster queries on large log sets
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ user: 1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);