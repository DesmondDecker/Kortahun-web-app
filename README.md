# 💧 Kortahun United — Water & Sewage Management System v2.0

Full-stack Netlify web application. React + Vite frontend, Netlify Functions (Node.js) backend, MongoDB Atlas database.

## Features

| Module | Description |
|---|---|
| 📊 Dashboard | KPI overview, revenue charts, bill status, upcoming appointments |
| 👥 Customers | Full CRUD, status management, service types |
| 💰 Billing | Create/edit bills, line items, mark as paid, PDF export |
| 📅 Appointments | Schedule, assign driver/vehicle, status tracking |
| 🚚 Deliveries | Record water/sewage deliveries, track cash & outstanding balances |
| 🚛 Vehicles | Fleet management, capacity, fuel type, service status |
| 👤 Drivers | Driver roster, license numbers, vehicle assignment |
| 💳 Payments | Record payments by method (Cash, Bank, Mobile Money) |
| 📉 Expenses | Track costs by category, analytics charts |
| 📈 Reports | Revenue & delivery charts, service mix, CSV export |
| 🗺️ GIS Pricing | Freetown zone-based delivery rate card (VTO official) |
| 🖥️ Terminal | Web terminal for quick stats & navigation commands |
| 📖 User Manual | In-app help and documentation |
| 📋 Audit Logs | Action history log |
| ⚙️ Settings | Company info, pricing, banking, password change |

## Deploy to Netlify

1. Push this repo to GitHub
2. Connect to Netlify → New Site from Git
3. Build settings are auto-detected from `netlify.toml`
4. Set environment variables in Netlify → Site Settings → Environment Variables:

```
MONGO_URI   = mongodb+srv://your-user:password@cluster.mongodb.net/kortahun?retryWrites=true&w=majority
JWT_SECRET  = your-super-secret-jwt-key-minimum-32-characters
```

5. Deploy!

## Local Development

```bash
npm install
# Create .env file in root:
# MONGO_URI=mongodb+srv://...
# JWT_SECRET=your-secret
netlify dev   # Runs frontend (port 5173) + functions (port 8888) together
```

## Tech Stack

- **Frontend**: React 18, Vite 5, Chakra UI 2, Recharts, React Router 6
- **Backend**: Netlify Functions (Node.js 20), Mongoose, JWT, bcrypt
- **Database**: MongoDB Atlas
- **Deployment**: Netlify (auto-deploy from GitHub)

---
*Developed by Summit Technologies — Lead Developer: Desmond Decker*
