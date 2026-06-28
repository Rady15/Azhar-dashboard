const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../../config/database');
const { asyncHandler, createError } = require('../../middleware/errorHandler');
const { getFileUrl } = require('../../middleware/upload');

const {
  generateAccessToken,
  generateRefreshToken
} = require('../../middleware/auth');
const { ROLES, OTP } = require('../../config/constants');

// ─── Built-in Super Admin fallback (works even with empty DB) ─
// Credentials configured via environment variables
const SUPER_ADMIN_EMAIL    = process.env.SUPER_ADMIN_EMAIL    || 'super@azhar-compound.sa';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@1234';
const SUPER_ADMIN_NAME     = process.env.SUPER_ADMIN_NAME     || 'Super Admin';

function isSuperAdminCredentials(email, password) {
  return email === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASSWORD;
}

// Virtual super admin token — no DB record needed
function buildVirtualSuperAdminToken() {
  const virtualUser = {
    id:          '00000000-0000-0000-0000-000000000000',
    role:        ROLES.SUPER_ADMIN,
    compound_id: 1,
    email:       SUPER_ADMIN_EMAIL,
    phone:       null,
    full_name:   SUPER_ADMIN_NAME
  };
  const accessToken  = generateAccessToken(virtualUser);
  const refreshToken = generateRefreshToken(virtualUser);
  return {
    access_token:  accessToken,
    refresh_token: refreshToken,
    token_type:    'Bearer',
    expires_in:    '15m',
    user: {
      id:          virtualUser.id,
      full_name:   SUPER_ADMIN_NAME,
      full_name_ar: 'سوبر أدمن',
      email:       SUPER_ADMIN_EMAIL,
      phone:       null,
      role:        ROLES.SUPER_ADMIN,
      compound_id: 1,
      avatar_url:  null
    }
  };
}

// ─── Helper: find user by email or phone ─────────────────
async function findUser(identifier) {
  return db('users')
    .where(function () {
      this.where('email', identifier).orWhere('phone', identifier);
    })
    .where('status', 'active')
    .first();
}

// ─── Helper: verify password ─────────────────────────────
async function verifyPassword(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}

// ─── Helper: build tokens response ───────────────────────
async function buildTokenResponse(user) {
  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Store refresh token hash in DB
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await db('refresh_tokens').insert({
    user_id:    user.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  });

  // Update last login timestamp
  await db('users').where('id', user.id).update({ last_login_at: new Date() });

  return {
    access_token:  accessToken,
    refresh_token: refreshToken,
    token_type:    'Bearer',
    expires_in:    '15m',
    user: {
      id:          user.id,
      full_name:   user.full_name,
      full_name_ar: user.full_name_ar,
      email:       user.email,
      phone:       user.phone,
      role:        user.role,
      compound_id: user.compound_id,
      avatar_url:  user.avatar_url
    }
  };
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/admin/login
// Email + password login for admin web panel
// ─────────────────────────────────────────────────────────────
exports.adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError('Email and password are required', 400);
  }

  console.log(`🔑 Admin login attempt: ${email}`);

  // ─── Check built-in Super Admin bypass FIRST ─────────────────
  if (isSuperAdminCredentials(email, password)) {
    console.log('🛡️ Virtual Super Admin login granted (DB bypass)');
    const tokens = buildVirtualSuperAdminToken();
    return res.json({ success: true, data: tokens });
  }

  // ─── Normal DB login ─────────────────────────────────────────
  let user;
  try {
    user = await db('users')
      .where('email', email)
      .whereIn('role', [ROLES.ADMIN, ROLES.SUPER_ADMIN])
      .where('status', 'active')
      .first();
  } catch (dbErr) {
    console.error('⚠️ DB error during admin login:', dbErr.message);
    throw createError('Service temporarily unavailable', 503);
  }

  console.log(`👤 User found: ${user ? user.id : 'null'}`);

  if (!user) {
    throw createError('Invalid email or password', 401);
  }

  const passwordMatch = await verifyPassword(password, user.password_hash);
  console.log(`🔐 Password match: ${passwordMatch}`);

  if (!passwordMatch) {
    throw createError('Invalid email or password', 401);
  }

  console.log(`📝 Building token response...`);
  const tokens = await buildTokenResponse(user);
  console.log(`✅ Login success for: ${email}`);
  res.json({ success: true, data: tokens });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/tenant/login
// Phone or email + password login for tenant mobile app
// ─────────────────────────────────────────────────────────────
exports.tenantLogin = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body; // identifier = phone or email

  if (!identifier || !password) {
    throw createError('Phone/email and password are required', 400);
  }

  const user = await db('users')
    .where(function () {
      this.where('email', identifier).orWhere('phone', identifier);
    })
    .where('role', ROLES.TENANT)
    .where('status', 'active')
    .first();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw createError('Invalid credentials', 401);
  }

  const tokens = await buildTokenResponse(user);
  res.json({ success: true, data: tokens });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/staff/login
// Phone + password login for maintenance staff app
// ─────────────────────────────────────────────────────────────
exports.staffLogin = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    throw createError('Phone and password are required', 400);
  }

  const user = await db('users')
    .where('phone', phone)
    .where('role', ROLES.STAFF)
    .where('status', 'active')
    .first();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw createError('Invalid phone or password', 401);
  }

  const tokens = await buildTokenResponse(user);
  res.json({ success: true, data: tokens });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Exchange a valid refresh token for a new access token
// ─────────────────────────────────────────────────────────────
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw createError('Refresh token required', 400);
  }

  let decoded;
  try {
    decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw createError('Invalid or expired refresh token', 401);
  }

  // Check token exists in DB and is not expired
  const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
  const storedToken = await db('refresh_tokens')
    .where('user_id', decoded.id)
    .where('token_hash', tokenHash)
    .where('expires_at', '>', new Date())
    .first();

  if (!storedToken) {
    throw createError('Refresh token has been revoked', 401);
  }

  // Fetch fresh user data
  const user = await db('users').where('id', decoded.id).where('status', 'active').first();
  if (!user) throw createError('User not found or inactive', 401);

  // Issue new access token
  const accessToken = generateAccessToken(user);
  res.json({
    success: true,
    data: { access_token: accessToken, token_type: 'Bearer', expires_in: '15m' }
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Send a password reset link via email
// ─────────────────────────────────────────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw createError('Email is required', 400);

  const user = await db('users').where('email', email).where('status', 'active').first();

  // Always respond success — don't reveal if email exists
  if (!user) {
    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  }

  // Generate reset token
  const rawToken  = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await db('password_resets').insert({
    user_id:    user.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + OTP.EXPIRES_MINUTES * 60 * 1000 * 6) // 60 min
  });

  // TODO: Send actual email via nodemailer
  // For development, just return the token
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  console.log(`🔑 Password reset URL for ${email}: ${resetUrl}`);

  res.json({ success: true, message: 'Password reset link sent to your email.' });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// Reset password using the emailed token
// ─────────────────────────────────────────────────────────────
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) {
    throw createError('Token and new password are required', 400);
  }

  if (new_password.length < 8) {
    throw createError('Password must be at least 8 characters', 400);
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const resetRecord = await db('password_resets')
    .where('token_hash', tokenHash)
    .where('used', false)
    .where('expires_at', '>', new Date())
    .first();

  if (!resetRecord) {
    throw createError('Invalid or expired reset token', 400);
  }

  const passwordHash = await bcrypt.hash(new_password, 12);

  await db.transaction(async trx => {
    await trx('users').where('id', resetRecord.user_id).update({ password_hash: passwordHash });
    await trx('password_resets').where('id', resetRecord.id).update({ used: true });
  });

  res.json({ success: true, message: 'Password reset successfully. Please login.' });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/2fa/send
// Send OTP code via SMS (or email)
// ─────────────────────────────────────────────────────────────
exports.sendOtp = asyncHandler(async (req, res) => {
  const { identifier } = req.body; // phone or email

  const user = await findUser(identifier);
  if (!user) throw createError('User not found', 404);

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  await db('otp_codes').insert({
    user_id:    user.id,
    code,
    purpose:    '2fa',
    expires_at: new Date(Date.now() + OTP.EXPIRES_MINUTES * 60 * 1000)
  });

  // TODO: Send via SMS gateway (e.g. Unifonic, SMS Misr)
  console.log(`📱 OTP for ${identifier}: ${code}`); // Dev only

  res.json({ success: true, message: 'OTP sent successfully.' });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/2fa/verify
// Verify OTP and return full tokens if valid
// ─────────────────────────────────────────────────────────────
exports.verifyOtp = asyncHandler(async (req, res) => {
  const { identifier, code } = req.body;

  const user = await findUser(identifier);
  if (!user) throw createError('User not found', 404);

  const otpRecord = await db('otp_codes')
    .where('user_id', user.id)
    .where('code', code)
    .where('purpose', '2fa')
    .where('used', false)
    .where('expires_at', '>', new Date())
    .orderBy('created_at', 'desc')
    .first();

  if (!otpRecord) {
    throw createError('Invalid or expired OTP', 401);
  }

  // Mark OTP as used
  await db('otp_codes').where('id', otpRecord.id).update({ used: true });

  const tokens = await buildTokenResponse(user);
  res.json({ success: true, data: tokens });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/change-password  [authenticated]
// Change password while logged in
// ─────────────────────────────────────────────────────────────
exports.changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    throw createError('Current and new passwords are required', 400);
  }

  if (new_password.length < 8) {
    throw createError('New password must be at least 8 characters', 400);
  }

  const user = await db('users').where('id', req.user.id).first();
  if (!(await verifyPassword(current_password, user.password_hash))) {
    throw createError('Current password is incorrect', 401);
  }

  const passwordHash = await bcrypt.hash(new_password, 12);
  await db('users').where('id', req.user.id).update({ password_hash: passwordHash });

  res.json({ success: true, message: 'Password changed successfully.' });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout  [authenticated]
// Revoke the current refresh token
// ─────────────────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (refresh_token) {
    const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    await db('refresh_tokens').where('token_hash', tokenHash).delete();
  }

  res.json({ success: true, message: 'Logged out successfully.' });
});

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me  [authenticated]
// Get the current user's profile
// ─────────────────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  const user = await db('users')
    .where('id', req.user.id)
    .select('id', 'full_name', 'full_name_ar', 'email', 'phone', 'role',
            'compound_id', 'avatar_url', 'national_id', 'nationality',
            'two_fa_enabled', 'last_login_at', 'created_at')
    .first();

  if (!user) throw createError('User not found', 404);

  res.json({ success: true, data: user });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/fcm-token  [authenticated]
// Update Firebase Cloud Messaging token for push notifications
// ─────────────────────────────────────────────────────────────
exports.updateFcmToken = asyncHandler(async (req, res) => {
  const { fcm_token } = req.body;
  if (!fcm_token) throw createError('FCM token is required', 400);

  await db('users').where('id', req.user.id).update({ fcm_token });
  res.json({ success: true, message: 'FCM token updated.' });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/profile  [authenticated]
// Update current user's profile info (name, phone, email, avatar, password)
// ─────────────────────────────────────────────────────────────
exports.updateProfile = asyncHandler(async (req, res) => {
  const { full_name, phone, email, password } = req.body;
  const userId = req.user.id;

  // Skip validation for virtual super admin
  if (userId === '00000000-0000-0000-0000-000000000000') {
    return res.json({ success: true, message: 'Virtual Super Admin profile cannot be edited.' });
  }

  const updates = {};
  if (full_name) updates.full_name = full_name;
  
  if (phone) {
    // Check if phone already registered by someone else
    const existingPhone = await db('users').where('phone', phone).whereNot('id', userId).first();
    if (existingPhone) throw createError('رقم الهاتف مسجل بالفعل لمستخدم آخر', 400);
    updates.phone = phone;
  }

  if (email) {
    // Check if email already registered by someone else
    const existingEmail = await db('users').where('email', email).whereNot('id', userId).first();
    if (existingEmail) throw createError('البريد الإلكتروني مسجل بالفعل لمستخدم آخر', 400);
    updates.email = email;
  }

  if (password) {
    if (password.length < 8) throw createError('يجب أن تكون كلمة المرور 8 أحرف على الأقل', 400);
    updates.password_hash = await bcrypt.hash(password, 12);
  }

  if (req.file) {
    updates.avatar_url = getFileUrl(req, req.file.path);
  }

  if (Object.keys(updates).length === 0) {
    throw createError('لم يتم إرسال أي تعديلات', 400);
  }

  const [updatedUser] = await db('users')
    .where('id', userId)
    .update(updates)
    .returning(['id', 'full_name', 'full_name_ar', 'email', 'phone', 'role', 'avatar_url', 'updated_at']);

  res.json({
    success: true,
    message: 'تم تحديث الملف الشخصي بنجاح',
    data: updatedUser
  });
});

