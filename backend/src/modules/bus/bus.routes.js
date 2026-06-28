const express = require('express');
const router = express.Router();
const c = require('./bus.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

const isAdmin  = [authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const isTenant = [authenticate, authorize(ROLES.TENANT)];

router.get('/',              ...isAdmin,  c.listRoutes);
router.post('/routes',       ...isAdmin,  c.createRoute);
router.put('/routes/:id',    ...isAdmin,  c.updateRoute);
router.get('/enrollments',   ...isAdmin,  c.listEnrollments);
router.post('/enroll',       ...isAdmin,  c.enrollChild);
router.put('/enrollments/:id',...isAdmin, c.updateEnrollment);
router.delete('/enrollments/:id', ...isAdmin, c.removeEnrollment);

// Tenant: see their children's bus info
router.get('/my-schedule',   ...isTenant, c.mySchedule);

module.exports = router;
