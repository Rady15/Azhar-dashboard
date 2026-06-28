const express = require('express');
const router = express.Router();
const c = require('./notifications.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

// All authenticated users
router.get('/my',         authenticate, c.myNotifications);
router.put('/:id/read',   authenticate, c.markRead);
router.put('/read-all',   authenticate, c.markAllRead);
router.delete('/:id',     authenticate, c.remove);

// Admin only
router.post('/broadcast', authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), c.broadcast);

module.exports = router;
