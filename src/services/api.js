// Single source of truth for all API calls to Netlify Functions
const BASE = '/api';

function getToken() { return localStorage.getItem('ku_token') || ''; }

function headers(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function rawGet(path) {
  const res = await fetch(`${BASE}${path}`, { headers: headers() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

async function request(method, path, body) {
  const opts = { method, headers: headers() };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res  = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status, data });
  }
  return data;
}

const get   = (p)       => request('GET', p);
const post  = (p, b)    => request('POST', p, b);
const put   = (p, b)    => request('PUT', p, b);
const del   = (p)       => request('DELETE', p);
const patch = (p, b)    => request('PATCH', p, b);

const qs = (params = {}) => { const q = new URLSearchParams(params).toString(); return q ? `?${q}` : ''; };

export const auth = {
  login:          (c)    => post('/auth/login', c),
  register:       (d)    => post('/auth/register', d),
  verify:         ()     => get('/auth/verify'),
  changePassword: (d)    => post('/auth/change-password', d),
};

export const customers = {
  list:         (p={})  => get(`/customers${qs(p)}`),
  getById:      (id)    => get(`/customers/${id}`),
  create:       (d)     => post('/customers', d),
  update:       (id,d)  => put(`/customers/${id}`, d),
  remove:       (id)    => del(`/customers/${id}`),
  search:       (q)     => get(`/customers/search?q=${encodeURIComponent(q)}`),
  stats:        ()      => get('/customers/stats'),
  updateStatus: (id,s)  => patch(`/customers/${id}/status`, { status: s }),
  checkExists:  (d)     => post('/customers/check-exists', d),
};

export const billing = {
  list:         (p={})  => get(`/bills${qs(p)}`),
  getById:      (id)    => get(`/bills/${id}`),
  create:       (d)     => post('/bills', d),
  update:       (id,d)  => put(`/bills/${id}`, d),
  remove:       (id)    => del(`/bills/${id}`),
  markPaid:     (id,d)  => post(`/bills/${id}/pay`, d),
  stats:        ()      => get('/bills/stats'),
  pdf:          (id)    => get(`/bills/${id}/pdf`),
};

export const appointments = {
  list:         (p={})  => get(`/appointments${qs(p)}`),
  listAll:      ()      => get('/appointments/all'),
  getById:      (id)    => get(`/appointments/${id}`),
  create:       (d)     => post('/appointments', d),
  update:       (id,d)  => put(`/appointments/${id}`, d),
  remove:       (id)    => del(`/appointments/${id}`),
  updateStatus: (id,s)  => patch(`/appointments/${id}/status`, { status: s }),
  complete:     (id,d)  => post(`/appointments/${id}/complete`, d),
  stats:        ()      => get('/appointments/stats'),
};

export const deliveries = {
  list:         (p={})  => get(`/deliveries${qs(p)}`),
  getById:      (id)    => get(`/deliveries/${id}`),
  create:       (d)     => post('/deliveries', d),
  update:       (id,d)  => put(`/deliveries/${id}`, d),
  remove:       (id)    => del(`/deliveries/${id}`),
  updateStatus: (id,s)  => patch(`/deliveries/${id}/status`, { status: s }),
  stats:        ()      => get('/deliveries/stats'),
};

export const vehicles = {
  list:         (p={})  => get(`/vehicles${qs(p)}`),
  getById:      (id)    => get(`/vehicles/${id}`),
  create:       (d)     => post('/vehicles', d),
  update:       (id,d)  => put(`/vehicles/${id}`, d),
  remove:       (id)    => del(`/vehicles/${id}`),
  stats:        ()      => get('/vehicles/stats'),
};

export const drivers = {
  list:         (p={})  => get(`/drivers${qs(p)}`),
  getById:      (id)    => get(`/drivers/${id}`),
  create:       (d)     => post('/drivers', d),
  update:       (id,d)  => put(`/drivers/${id}`, d),
  remove:       (id)    => del(`/drivers/${id}`),
  stats:        ()      => get('/drivers/stats'),
};

export const payments = {
  list:         (p={})  => get(`/payments${qs(p)}`),
  getById:      (id)    => get(`/payments/${id}`),
  create:       (d)     => post('/payments', d),
  update:       (id,d)  => put(`/payments/${id}`, d),
  remove:       (id)    => del(`/payments/${id}`),
  stats:        ()      => get('/payments/stats'),
};

export const expenses = {
  list:         (p={})  => get(`/expenses${qs(p)}`),
  getById:      (id)    => get(`/expenses/${id}`),
  create:       (d)     => post('/expenses', d),
  update:       (id,d)  => put(`/expenses/${id}`, d),
  remove:       (id)    => del(`/expenses/${id}`),
  stats:        ()      => get('/expenses/stats'),
};

export const reports = {
  summary:      (p={})  => get(`/reports/summary${qs(p)}`),
  revenue:      (p={})  => get(`/reports/revenue${qs(p)}`),
  deliveries:   (p={})  => get(`/reports/deliveries${qs(p)}`),
};

export const dashboard = {
  stats:        ()      => get('/dashboard'),
};

export const auditLogs = {
  list:         (p={})  => get(`/audit-logs${qs(p)}`),
};

export const settings = {
  get:          ()      => get('/settings'),
  update:       (d)     => post('/settings', d),
};

// Aliases for backward compat with existing pages
export const bills = {
  ...billing,
  allCustomers: ()      => get('/bills/customers/all'),
  analytics:    ()      => get('/bills/analytics/summary'),
  exportCSV:    (p={})  => rawGet(`/bills/export/csv${qs(p)}`),
};
export const deliveryNotes = {
  list:       (p={})  => get(`/delivery-notes${qs(p)}`),
  create:     (d)     => post('/delivery-notes', d),
  getById:    (id)    => get(`/delivery-notes/${id}`),
  remove:     (id)    => del(`/delivery-notes/${id}`),
  getForBill: (id)    => get(`/delivery-notes?billId=${id}`),
};
