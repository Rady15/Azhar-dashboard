const express = require('express');
const router = express.Router();
const c = require('./staff.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { uploadSingleImage } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');

const isAdmin = [authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const isStaff = [authenticate, authorize(ROLES.STAFF)];
const isAdminOrStaff = [authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.STAFF)];

router.get('/',       ...isAdmin,        c.listStaff);
router.post('/',      ...isAdmin,        uploadSingleImage, c.createStaff);
router.get('/:id',    ...isAdminOrStaff, c.getStaff);
router.put('/:id',    ...isAdminOrStaff, uploadSingleImage, c.updateStaff);
router.delete('/:id', ...isAdmin,        c.deactivateStaff);

module.exports = router;
