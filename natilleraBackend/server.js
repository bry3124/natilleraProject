require('dotenv').config();
const express = require('express');
const cors = require('cors');

const socioRoutes = require('./routes/socioRoutes');
const pagoRoutes = require('./routes/pagoRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const prestamoRoutes = require('./routes/prestamoRoutes');
const rifaRoutes = require('./routes/rifaRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');

const { initCronJobs } = require('./cronService');
const { initWhatsApp } = require('./whatsappService');

const app = express();

// Initialize Services
initCronJobs();
initWhatsApp();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/socios', socioRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/prestamos', prestamoRoutes);
app.use('/api/rifas', rifaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);

// Health Check
app.get('/', (req, res) => {
  res.json({ status: 'API Online', version: '1.0.0' });
});

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
});
