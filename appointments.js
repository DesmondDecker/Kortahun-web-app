const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');

if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGO_URI);
}

const app = express();
app.use(express.json());

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', new mongoose.Schema({
  customerName: String, // Model uses string name as per dashboard.js fix
  service: String,      // Matches 'service' field from Reports/Dashboard fix
  status: { type: String, default: 'pending' },
  appointmentDate: Date,
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }
}, { timestamps: true }));

const router = express.Router();

// Fix 1: Proper subPath matching for Netlify functions and status routing
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    // Fix 3: Handle status case (cancelled not Cancelled)
    const normalizedStatus = status.toLowerCase() === 'cancelled' ? 'cancelled' : status;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status: normalizedStatus },
      { new: true }
    );

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Use the subpath relative to the Netlify function endpoint
app.use('/.netlify/functions/appointments', router);

exports.handler = serverless(app);