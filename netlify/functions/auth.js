// netlify/functions/auth.js
const connectDB = require('./lib/mongodb');
const mongoose  = require('mongoose');
const { signToken, logAction, requireAuth, ok, err, cors } = require('./lib/auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors();

  // Simplified path detection
  const segments = event.path.split('/');
  const path = segments[segments.length - 1];
  
  const method = event.httpMethod;
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  try {
    await connectDB();

    // Late-require model to ensure connection is established
    const User = require('./lib/models/User');

    // POST /api/auth/register
    if (method === 'POST' && path === 'register') {
      const { username, email, password } = body;
      if (!username || !email || !password) return err('username, email and password are required', 400);

      const normalizedEmail = email.toLowerCase().trim();
      const normalizedUser  = username.toLowerCase().trim();

      const exists = await User.findOne({ $or: [{ email: normalizedEmail }, { username: normalizedUser }] });
      if (exists) return err('User with that email or username already exists', 400);

      const user = await User.create({ username: normalizedUser, email: normalizedEmail, password, role: 'operator' });
      const token = signToken({ userId: user._id, username: user.username, role: user.role });

      return ok({ success: true, token, user: { id: user._id, username: user.username, email: user.email, role: user.role } }, 201);
    }

    // POST /api/auth/login
    if (method === 'POST' && path === 'login') {
      const { username, password } = body;
      if (!username || !password) return err('username and password are required', 400);

      const user = await User.findOne({ $or: [{ username }, { email: username }] });
      if (!user || !(await user.comparePassword(password))) return err('Invalid credentials', 401);
      if (!user.isActive) return err('Account is disabled', 403);

      user.lastLogin = new Date();
      await user.save();
      await logAction(user.username, 'LOGIN', 'User', user._id);

      const token = signToken({ userId: user._id, username: user.username, role: user.role });
      return ok({ success: true, token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    }

    // GET /api/auth/verify
    if (method === 'GET' && path === 'verify') {
      const payload = requireAuth(event.headers);
      const user    = await User.findById(payload.userId).select('-password');
      if (!user) return err('User not found', 404);
      return ok({ success: true, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    }

    // POST /api/auth/change-password
    if (method === 'POST' && path === 'change-password') {
      const payload = requireAuth(event.headers);
      const { oldPassword, newPassword } = body;
      if (!oldPassword || !newPassword) return err('oldPassword and newPassword required', 400);

      const user = await User.findById(payload.userId);
      if (!user || !(await user.comparePassword(oldPassword))) return err('Current password incorrect', 401);

      user.password = newPassword;
      await user.save();
      return ok({ success: true, message: 'Password updated' });
    }

    return err('Endpoint not found', 404);
  } catch (e) {
    if (e.message.includes('MONGO_URI')) return err('Database configuration missing', 500);
    if (e.message.includes('JWT_SECRET')) return err('Authentication secret missing', 500);
    if (e.name === 'ValidationError') {
      return err('Validation error', 400, { errors: Object.values(e.errors).map(x => x.message) });
    }
    if (e.code === 11000) {
      const field = Object.keys(e.keyPattern)[0];
      return err(`${field} already exists`, 400);
    }
    if (e.name === 'CastError' || e.name === 'MongooseError') return err(e.message, 400);
    if (e.status === 401) return err(e.message, 401);
    console.error('[auth]', e);
    return err('Server error', 500);
  }
};
