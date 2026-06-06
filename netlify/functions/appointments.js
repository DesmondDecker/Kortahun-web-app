const connectDB = require('./lib/mongodb'); // This will now handle dotenv.config()
const Appointment = require('./lib/models/Appointment');
const Delivery    = require('./lib/models/Delivery');
const Customer    = require('./lib/models/Customer');
const { requireAuth, logAction, ok, err, cors } = require('./lib/auth');

function getSubPath(event) {
  return (event.path || '')
    .replace(/.*\/appointments\/?/, '')
    .replace(/^\/+|\/+$/g, '');
}

// Map appointment service types → delivery service types
function mapServiceType(aptService) {
  if (!aptService) return 'Water Supply';
  const s = aptService.toLowerCase();
  if (s.includes('sewage') || s.includes('disposal')) return 'Sewage Disposal';
  return 'Water Supply';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();

  const method  = event.httpMethod;
  const subPath = getSubPath(event);
  const qs      = event.queryStringParameters || {};
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  try {
    await connectDB();
    const user = requireAuth(event.headers);

    // ── GET /api/appointments — list ───────────────────────────────────────
    if (method === 'GET' && !subPath) {
      const filter = {};
      if (qs.status)  filter.status  = qs.status;
      if (qs.service) filter.service = qs.service;
      // Default: exclude completed & cancelled unless explicitly requested
      if (!qs.status && qs.include_all !== 'true') {
        filter.status = { $nin: ['completed', 'cancelled'] };
      }
      const list = await Appointment.find(filter).sort({ date: 1, time: 1 });
      return ok({ success: true, data: list, total: list.length });
    }

    // ── GET /api/appointments/all — include completed/cancelled ────────────
    if (method === 'GET' && subPath === 'all') {
      const list = await Appointment.find({}).sort({ date: -1 });
      return ok({ success: true, data: list, total: list.length });
    }

    // ── GET /api/appointments/stats ────────────────────────────────────────
    if (method === 'GET' && subPath === 'stats') {
      const [total, scheduled, inProgress, completed, cancelled] = await Promise.all([
        Appointment.countDocuments(),
        Appointment.countDocuments({ status: 'scheduled' }),
        Appointment.countDocuments({ status: 'in-progress' }),
        Appointment.countDocuments({ status: 'completed' }),
        Appointment.countDocuments({ status: 'cancelled' }),
      ]);
      return ok({ success: true, data: { total, scheduled, inProgress, completed, cancelled } });
    }

    // ── POST /api/appointments — create ────────────────────────────────────
    if (method === 'POST' && !subPath) {
      if (!body.customerName?.trim()) return err('customerName is required', 400);
      if (!body.customerPhone?.trim()) return err('customerPhone is required', 400);
      if (!body.service) return err('service is required', 400);
      if (!body.date)    return err('date is required', 400);
      if (!body.time)    return err('time is required', 400);

      const apt = await Appointment.create({ ...body, status: body.status || 'scheduled' });
      await logAction(user.username, 'CREATE', 'Appointment', apt._id, { customer: body.customerName });
      return ok({ success: true, data: apt }, 201);
    }

    // ── POST /api/appointments/:id/complete — mark complete + create delivery
    if (method === 'POST' && subPath.endsWith('/complete')) {
      const id = subPath.replace('/complete', '');
      if (!id || id.length !== 24) return err('Invalid appointment ID', 400);

      const apt = await Appointment.findById(id);
      if (!apt) return err('Appointment not found', 404);
      if (apt.status === 'completed') return err('Appointment already completed', 400);
      if (apt.status === 'cancelled') return err('Cannot complete a cancelled appointment', 400);

      // Try to find a matching customer by phone number
      const customer = await Customer.findOne({ phone: apt.customerPhone });

      // Build delivery payload from appointment data
      const serviceType   = mapServiceType(apt.service);
      const unitPrice     = Number(body.unit_price) || 1700;
      const trips         = Number(body.trips)      || 1;
      const quantity      = Number(body.quantity_litres) || 5000;
      const cashReceived  = Number(body.cash_received)   || 0;
      const totalAmount   = unitPrice * trips;
      const outstanding   = Math.max(0, totalAmount - cashReceived);
      let   payStatus     = cashReceived >= totalAmount && totalAmount > 0 ? 'Paid'
                          : cashReceived > 0 ? 'Partial' : 'Unpaid';

      const deliveryData = {
        // Link to customer record if found, otherwise store name in notes
        customer:            customer?._id || null,
        vehicle:             body.vehicle_id   || null,
        driver:              body.driver_id    || null,
        service_type:        serviceType,
        quantity_litres:     quantity,
        unit_price:          unitPrice,
        trips,
        total_amount:        totalAmount,
        cash_received:       cashReceived,
        outstanding_balance: outstanding,
        payment_status:      payStatus,
        delivery_date:       apt.date,
        notes: [
          `Auto-created from Appointment #${apt._id}`,
          `Customer: ${apt.customerName} (${apt.customerPhone})`,
          apt.technician ? `Technician: ${apt.technician}` : '',
          body.extra_notes ? body.extra_notes : '',
          apt.notes ? `Apt notes: ${apt.notes}` : '',
        ].filter(Boolean).join(' | '),
        // Extra metadata stored in notes if no customer record
        ...(customer ? {} : { _appointmentCustomerName: apt.customerName }),
      };

      // If no matched customer, delivery will have customer: null
      // The notes field preserves the customer name for reference

      const [updatedApt, delivery] = await Promise.all([
        Appointment.findByIdAndUpdate(id,
          { status: 'completed', completedAt: new Date() },
          { new: true }
        ),
        Delivery.create(deliveryData),
      ]);

      await logAction(user.username, 'COMPLETE', 'Appointment', id, {
        customer:    apt.customerName,
        deliveryId:  delivery._id,
        linked:      !!customer,
      });

      return ok({
        success: true,
        data: {
          appointment:    updatedApt,
          delivery,
          customerLinked: !!customer,
          message: customer
            ? `Delivery created and linked to customer "${customer.name}"`
            : `Delivery created. Note: no customer record found for phone ${apt.customerPhone}`,
        },
      });
    }

    // ── PATCH /api/appointments/:id/status ─────────────────────────────────
    if (method === 'PATCH' && subPath.endsWith('/status')) {
      const id    = subPath.replace('/status', '');
      const inputStatus = body.status;
      if (!inputStatus) return err('Status is required', 400);
      const valid = ['scheduled', 'in-progress', 'completed', 'cancelled'];
      const normalizedStatus = inputStatus.toLowerCase(); // Normalize to lowercase
      if (!valid.includes(normalizedStatus)) return err(`Status must be one of: ${valid.join(', ')}`, 400);
      if (normalizedStatus === 'completed') return err("Use POST /:id/complete to complete an appointment — it auto-creates a delivery", 400);

      const apt = await Appointment.findByIdAndUpdate(id, { status: normalizedStatus }, { new: true });
      if (!apt) return err('Appointment not found', 404);
      await logAction(user.username, 'UPDATE_STATUS', 'Appointment', id, { status: normalizedStatus });
      return ok({ success: true, data: apt });
    }

    // ── ID-based CRUD ───────────────────────────────────────────────────────
    const id = subPath.split('/')[0];
    if (!id || id.length !== 24) return err('Invalid appointment ID', 400);

    if (method === 'GET') {
      const apt = await Appointment.findById(id);
      if (!apt) return err('Appointment not found', 404);
      return ok({ success: true, data: apt });
    }

    if (method === 'PUT') {
      const apt = await Appointment.findByIdAndUpdate(id, body, { new: true, runValidators: true });
      if (!apt) return err('Appointment not found', 404);
      await logAction(user.username, 'UPDATE', 'Appointment', id);
      return ok({ success: true, data: apt });
    }

    if (method === 'DELETE') {
      const apt = await Appointment.findByIdAndDelete(id);
      if (!apt) return err('Appointment not found', 404);
      await logAction(user.username, 'DELETE', 'Appointment', id);
      return ok({ success: true, message: 'Appointment removed' });
    }

    return err('Not Found', 404);
  } catch (e) {
    if (e.code === 11000) {
      const field = Object.keys(e.keyPattern || {}).map(k => k.replace('_', ' ')).join(', ');
      return err(`${field} already exists`, 400);
    }
    if (e.name === 'ValidationError') return err('Validation: ' + Object.values(e.errors).map(x => x.message).join(', '), 400);
    if (e.name === 'CastError')       return err('Invalid ID format', 400);
    if (e.status === 401)             return err(e.message, 401);
    console.error('[appointments]', e);
    return err(e.message || 'Server error', e.status || 500);
  }
};
