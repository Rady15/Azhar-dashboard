require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import all route modules
const authRoutes          = require('./modules/auth/auth.routes');
const villasRoutes        = require('./modules/villas/villas.routes');
const tenantsRoutes       = require('./modules/tenants/tenants.routes');
const maintenanceRoutes   = require('./modules/maintenance/maintenance.routes');
const complaintsRoutes    = require('./modules/complaints/complaints.routes');
const paymentsRoutes      = require('./modules/payments/payments.routes');
const announcementsRoutes = require('./modules/announcements/announcements.routes');
const busRoutes           = require('./modules/bus/bus.routes');
const staffRoutes         = require('./modules/staff/staff.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const reportsRoutes       = require('./modules/reports/reports.routes');
const facilitiesRoutes    = require('./modules/facilities/facilities.routes');
const backupRoutes        = require('./modules/backup/backup.routes');
const { initScheduler }   = require('./services/backupService');

const app = express();

// ─── Trust Proxy (required for HF Spaces / Nginx reverse proxy) ──
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// Trust all proxies (HuggingFace Spaces uses multi-layer proxy)
app.set('trust proxy', true);

// ─── Security & Logging ──────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── CORS ─────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Rate Limiting ────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests, please try again later.' },
  keyGenerator: (req) => `${req.ip}:${req.headers['user-agent']?.slice(0,30) || 'unknown'}`
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' },
  keyGenerator: (req) => `${req.ip}:${req.headers['user-agent']?.slice(0,30) || 'unknown'}`
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// ─── Body Parsing ─────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ─── Static Files (uploaded media) ───────────────────────
const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadDir), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// ─── Health Check ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status:  'healthy',
    version: '1.0.0',
    time:    new Date().toISOString()
  });
});

// ─── API Routes ───────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/villas',        villasRoutes);
app.use('/api/tenants',       tenantsRoutes);
app.use('/api/maintenance',   maintenanceRoutes);
app.use('/api/complaints',    complaintsRoutes);
app.use('/api/payments',      paymentsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/bus',           busRoutes);
app.use('/api/staff',         staffRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports',       reportsRoutes);
app.use('/api/facilities',    facilitiesRoutes);
app.use('/api/backup',        backupRoutes);

// ─── Initialize Automated Daily Backup ──────────────────────────
// Will run first backup 10 seconds after startup, then every 24h
try { initScheduler(); } catch (e) { console.error('Backup scheduler init error:', e.message); }

// ─── Error Handling ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
