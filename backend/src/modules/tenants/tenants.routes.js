const express = require('express');
const router = express.Router();
const c = require('./tenants.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { uploadSingleImage } = require('../../middleware/upload');
const { ROLES } = require('../../config/constants');

const isAdmin  = [authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)];
const isTenant = [authenticate, authorize(ROLES.TENANT)];
const isAdminOrTenant = [authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.TENANT)];

// Admin: full tenant management
router.get('/',     ...isAdmin,        c.listTenants);
router.post('/',    ...isAdmin,        uploadSingleImage, c.createTenant);
router.get('/:id',  ...isAdminOrTenant, c.getTenant);
router.put('/:id',  ...isAdminOrTenant, uploadSingleImage, c.updateTenant);

// Dependents
router.get('/:id/dependents',             ...isAdminOrTenant, c.listDependents);
router.post('/:id/dependents',            ...isAdmin,         uploadSingleImage, c.addDependent);
router.put('/:id/dependents/:depId',      ...isAdmin,         uploadSingleImage, c.updateDependent);
router.delete('/:id/dependents/:depId',   ...isAdmin,         c.removeDependent);

// Lease
router.get('/:id/lease',  ...isAdminOrTenant, c.getTenantLease);

module.exports = router;
