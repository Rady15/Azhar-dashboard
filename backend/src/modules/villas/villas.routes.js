const express = require('express');
const router = express.Router();
const c = require('./villas.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { uploadMultipleImages } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');

const isAdmin = [authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)];

router.get('/',         ...isAdmin, c.listVillas);
router.post('/',        ...isAdmin, uploadMultipleImages, c.createVilla);
router.get('/:id',      ...isAdmin, c.getVilla);
router.put('/:id',      ...isAdmin, uploadMultipleImages, c.updateVilla);
router.delete('/:id',   ...isAdmin, c.deleteVilla);

module.exports = router;
