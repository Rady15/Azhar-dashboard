const express = require('express');
const router = express.Router();
const c = require('./announcements.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

const isAdmin  = [authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const isTenant = [authenticate, authorize(ROLES.TENANT)];

router.get('/',     ...isAdmin,  c.listAll);
router.post('/',    ...isAdmin,  c.create);
router.delete('/:id', ...isAdmin, c.remove);

// Tenant: see announcements relevant to them
router.get('/my',   ...isTenant, c.myAnnouncements);

module.exports = router;
