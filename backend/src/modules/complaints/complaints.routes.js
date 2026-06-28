const express = require('express');
const router = express.Router();
const c = require('./complaints.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

const isAdmin  = [authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const isTenant = [authenticate, authorize(ROLES.TENANT)];

router.get('/',           ...isAdmin,  c.listComplaints);
router.post('/',          ...isTenant, c.submitComplaint);
router.get('/:id',        ...isAdmin,  c.getComplaint);
router.post('/:id/reply', ...isAdmin,  c.replyToComplaint);
router.put('/:id/resolve',...isAdmin,  c.resolveComplaint);

// Tenant: see their own complaints
router.get('/my/list',    ...isTenant, c.myComplaints);

module.exports = router;
