const express = require('express');
const router = express.Router();
const c = require('./reports.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

const isAdmin = [authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)];

router.get('/dashboard',    ...isAdmin, c.getDashboard);
router.get('/financial',    ...isAdmin, c.getFinancial);
router.get('/maintenance',  ...isAdmin, c.getMaintenance);

module.exports = router;
