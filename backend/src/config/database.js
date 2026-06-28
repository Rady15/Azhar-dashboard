const knex = require('knex');

// Database connection using the DATABASE_URL from environment
const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  },
  pool: {
    min: 2,
    max: 10,
    // Gracefully handle connection drops
    afterCreate(conn, done) {
      conn.query('SET timezone="UTC";', (err) => done(err, conn));
    }
  },
  // Log queries in development mode
  debug: process.env.NODE_ENV === 'development'
});

// Test the connection on startup
async function testConnection() {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Database connected successfully');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { db, testConnection };
