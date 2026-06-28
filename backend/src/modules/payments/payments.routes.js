const express = require('express');
const router = express.Router();
const c = require('./payments.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/constants');

const isAdmin  = [authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const isTenant = [authenticate, authorize(ROLES.TENANT)];

// Admin routes
router.get('/matrix',           ...isAdmin,  c.getPaymentMatrix);
router.get('/transactions',     ...isAdmin,  c.listTransactions);
router.post('/',                ...isAdmin,  c.addPayment);
router.get('/invoices/overdue', ...isAdmin,  c.getOverdueInvoices);
router.post('/reminders',       ...isAdmin,  c.sendReminders);

// Tenant routes
router.get('/my',               ...isTenant, c.myPayments);
router.get('/my/receipts/:id',  ...isTenant, c.downloadReceipt);

module.exports = router;
