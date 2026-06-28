const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');

const BACKUP_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads', 'backups');

// Tables in dependency order (parent tables first for inserts, reverse for truncating)
const TABLES_ORDER = [
  'compounds',
  'users',
  'villas',
  'leases',
  'dependents',
  'maintenance_requests',
  'maintenance_media',
  'job_time_logs',
  'complaints',
  'complaint_replies',
  'invoices',
  'payments',
  'bus_routes',
  'bus_enrollments',
  'notifications',
  'email_templates',
  'support_tickets',
  'facilities',
  'facility_bookings',
  'audit_log'
];

/**
 * Creates a database backup as a serialized JSON file.
 */
async function createBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const backupData = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    data: {}
  };

  // Fetch all rows from each table
  for (const table of TABLES_ORDER) {
    try {
      const rows = await db(table).select('*');
      backupData.data[table] = rows;
    } catch (err) {
      console.error(`⚠️ Backup failed for table ${table}:`, err.message);
      backupData.data[table] = [];
    }
  }

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`💾 Backup created successfully: ${filename}`);

  return { filename, filepath };
}

/**
 * Restores a database backup from a JSON file.
 */
async function restoreBackup(filename) {
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error('Backup file does not exist');
  }

  const backupData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  const data = backupData.data;

  await db.transaction(async (trx) => {
    console.log('🔄 Restoring database backup... Truncating tables...');

    // 1. Truncate tables in reverse order to respect foreign key constraints
    for (const table of [...TABLES_ORDER].reverse()) {
      try {
        await trx.raw(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (err) {
        console.warn(`⚠️ Failed to truncate ${table}:`, err.message);
      }
    }

    // 2. Insert data back in correct dependency order
    for (const table of TABLES_ORDER) {
      const rows = data[table] || [];
      if (rows.length === 0) continue;

      console.log(`📥 Inserting ${rows.length} rows into ${table}...`);
      
      // Batch inserts of 100 rows to prevent query size limit issues
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        await trx(table).insert(chunk);
      }

      // Reset serial sequence if the table has an id field that is a serial sequence
      try {
        const hasSerial = await trx.raw(`
          SELECT pg_get_serial_sequence('"${table}"', 'id') as seq
        `);
        const seq = hasSerial.rows[0]?.seq;
        if (seq) {
          await trx.raw(`SELECT setval('${seq}', COALESCE((SELECT MAX(id)+1 FROM "${table}"), 1), false)`);
        }
      } catch (err) {
        // Silently skip sequence reset if table doesn't have integer id
      }
    }
  });

  console.log('✅ Database restore completed successfully.');
}

/**
 * Lists all available backup files.
 */
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }

  return fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
    .map(file => {
      const stat = fs.statSync(path.join(BACKUP_DIR, file));
      return {
        filename: file,
        size_kb: Math.round(stat.size / 1024),
        created_at: stat.birthtime
      };
    })
    .sort((a, b) => b.created_at - a.created_at);
}

/**
 * Initializes automatic backups every 24 hours.
 */
function initScheduler() {
  // Simple startup backup and set interval for 24h
  setTimeout(async () => {
    try {
      console.log('⏰ Running automatic daily backup on startup...');
      await createBackup();
    } catch (err) {
      console.error('❌ Automatic backup failed:', err.message);
    }
  }, 10000); // 10s after startup

  // Back up every 24 hours
  setInterval(async () => {
    try {
      console.log('⏰ Running scheduled 24h backup...');
      await createBackup();
    } catch (err) {
      console.error('❌ Scheduled backup failed:', err.message);
    }
  }, 24 * 60 * 60 * 1000);
}

/**
 * Clears all data from all tables (Super Admin only!).
 */
async function clearAllTables() {
  await db.transaction(async (trx) => {
    for (const table of [...TABLES_ORDER].reverse()) {
      try {
        await trx.raw(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (err) {
        console.warn(`⚠️ Failed to truncate ${table}:`, err.message);
      }
    }
  });
  console.log('🗑️ All database tables cleared successfully.');
}

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  initScheduler,
  clearAllTables
};
