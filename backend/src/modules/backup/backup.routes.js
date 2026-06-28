const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');
const backupService = require('../../services/backupService');
const path = require('path');
const fs = require('fs');

const BACKUP_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads', 'backups');

// Allow admins and super admins to see backups
router.get('/list', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), (req, res) => {
  try {
    const list = backupService.listBackups();
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Trigger backup manually
router.post('/create', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const result = await backupService.createBackup();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Restore backup (Super Admin only!)
router.post('/restore', authenticate, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ success: false, message: 'filename is required' });
  }

  try {
    await backupService.restoreBackup(filename);
    res.json({ success: true, message: 'Database restored successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Download backup file
router.get('/download/:filename', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(BACKUP_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ success: false, message: 'Backup file not found' });
  }

  res.download(filepath, filename);
});

// Clear all database tables (Super Admin only!)
router.post('/clear-all', authenticate, authorize(ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    await backupService.clearAllTables();
    res.json({ success: true, message: 'All database tables cleared successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
