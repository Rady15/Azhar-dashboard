const express = require('express');
const router = express.Router();
const c = require('./maintenance.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { uploadMultipleImages } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');

const isAdmin  = [authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const isTenant = [authenticate, authorize(ROLES.TENANT)];
const isStaff  = [authenticate, authorize(ROLES.STAFF)];
const isAny    = [authenticate];

// Admin: see all requests
router.get('/',                 ...isAdmin,  c.listAll);

// Tenant: submit a new request with photos
router.post('/',                ...isTenant, uploadMultipleImages, c.submitRequest);

// Shared: get ticket detail (admin, tenant owner, assigned staff)
router.get('/:id',              ...isAny,    c.getTicket);

// Admin: assign a technician
router.put('/:id/assign',       ...isAdmin,  c.assignTechnician);

// Staff: start job
router.put('/:id/start',        ...isStaff,  c.startJob);

// Staff: complete job with after-photos
router.put('/:id/complete',     ...isStaff,  uploadMultipleImages, c.completeJob);

// Tenant: rate a completed job
router.post('/:id/rate',        ...isTenant, c.rateService);

// Staff-specific routes
router.get('/staff/my-tasks',   ...isStaff,  c.myTasks);
router.get('/staff/completed',  ...isStaff,  c.completedJobs);

module.exports = router;
