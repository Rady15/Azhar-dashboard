const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const { uploadSingleImage } = require('../../middleware/upload');


// ─── Public routes (no token needed) ─────────────────────
router.post('/admin/login',       controller.adminLogin);
router.post('/tenant/login',      controller.tenantLogin);
router.post('/staff/login',       controller.staffLogin);
router.post('/refresh',           controller.refreshToken);
router.post('/forgot-password',   controller.forgotPassword);
router.post('/reset-password',    controller.resetPassword);
router.post('/2fa/send',          controller.sendOtp);
router.post('/2fa/verify',        controller.verifyOtp);

// ─── Protected routes (token required) ───────────────────
router.put('/change-password',    authenticate, controller.changePassword);
router.put('/profile',            authenticate, uploadSingleImage, controller.updateProfile);
router.post('/logout',            authenticate, controller.logout);
router.get('/me',                 authenticate, controller.getMe);
router.put('/fcm-token',          authenticate, controller.updateFcmToken);


module.exports = router;
