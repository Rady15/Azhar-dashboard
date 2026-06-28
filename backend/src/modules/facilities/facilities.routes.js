const express = require('express');
const router = express.Router();
const c = require('./facilities.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { uploadMultipleImages } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');

const isAdmin  = [authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const isTenant = [authenticate, authorize(ROLES.TENANT)];
const isAny    = [authenticate];

// Admin & Tenant: view facilities
router.get('/',                  ...isAny,    c.listFacilities);

// Admin: manage facilities
router.post('/',                 ...isAdmin,  uploadMultipleImages, c.createFacility);
router.put('/:id',               ...isAdmin,  uploadMultipleImages, c.updateFacility);
router.delete('/:id',            ...isAdmin,  c.deleteFacility);

// Admin: view bookings for a facility
router.get('/:id/bookings',      ...isAdmin,  c.listBookings);

// Tenant: book a facility
router.post('/:id/book',         ...isTenant, c.bookFacility);

// Admin: update booking status
router.put('/bookings/:id/status', ...isAdmin, c.updateBookingStatus);

module.exports = router;
