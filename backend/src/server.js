require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function start() {
  // Test DB connection before accepting requests
  await testConnection();

  app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║   Compound Management System — API Server     ║');
    console.log('╠═══════════════════════════════════════════════╣');
    console.log(`║  🚀 Running at: http://localhost:${PORT}          ║`);
    console.log(`║  🌍 Environment: ${(process.env.NODE_ENV || 'development').padEnd(26)} ║`);
    console.log('╠═══════════════════════════════════════════════╣');
    console.log('║  Endpoints:                                   ║');
    console.log('║  POST /api/auth/admin/login                   ║');
    console.log('║  POST /api/auth/tenant/login                  ║');
    console.log('║  POST /api/auth/staff/login                   ║');
    console.log('║  GET  /api/health                             ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
