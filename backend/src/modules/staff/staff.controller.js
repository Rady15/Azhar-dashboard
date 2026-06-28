const bcrypt = require('bcryptjs');
const { db } = require('../../config/database');
const { asyncHandler, createError } = require('../../middleware/errorHandler');
const { ROLES } = require('../../config/constants');
const { getFileUrl } = require('../../middleware/upload');

exports.listStaff = asyncHandler(async (req, res) => {
  const staff = await db('users as u')
    .where('u.compound_id', req.user.compound_id)
    .where('u.role', ROLES.STAFF)
    .select(
      'u.id', 'u.full_name', 'u.phone', 'u.email',
      'u.status', 'u.avatar_url', 'u.created_at',
      db.raw('COUNT(m.id) FILTER (WHERE m.status IN (\'assigned\',\'in_progress\')) as active_jobs'),
      db.raw('COUNT(m.id) FILTER (WHERE m.status = \'completed\') as total_completed')
    )
    .leftJoin('maintenance_requests as m', 'm.assigned_to', 'u.id')
    .groupBy('u.id')
    .orderBy('u.full_name');

  res.json({ success: true, data: staff });
});

exports.createStaff = asyncHandler(async (req, res) => {
  const { full_name, full_name_ar, phone, email, password } = req.body;

  if (!full_name || !phone || !password) throw createError('Name, phone, and password are required', 400);

  const existing = await db('users').where('phone', phone).first();
  if (existing) throw createError('Phone already registered', 409);

  const passwordHash = await bcrypt.hash(password, 12);
  const avatar_url = req.file ? getFileUrl(req, req.file.path) : undefined;

  const [user] = await db('users').insert({
    compound_id: req.user.compound_id,
    role:        ROLES.STAFF,
    full_name, full_name_ar, phone, email,
    password_hash: passwordHash,
    avatar_url
  }).returning('id', 'full_name', 'phone', 'email', 'role', 'status', 'avatar_url', 'created_at');

  res.status(201).json({ success: true, data: user });
});

exports.getStaff = asyncHandler(async (req, res) => {
  const targetId = req.params.id;

  // Staff can only view their own profile
  if (req.user.role === ROLES.STAFF && req.user.id !== targetId) {
    throw createError('Access denied', 403);
  }

  const user = await db('users')
    .where({ id: targetId, compound_id: req.user.compound_id, role: ROLES.STAFF })
    .select('id', 'full_name', 'full_name_ar', 'phone', 'email', 'avatar_url', 'status', 'created_at')
    .first();

  if (!user) throw createError('Staff member not found', 404);

  // Performance stats
  const [stats] = await db('maintenance_requests')
    .where('assigned_to', targetId)
    .select(
      db.raw("COUNT(*) FILTER (WHERE status = 'completed') as completed"),
      db.raw("COUNT(*) FILTER (WHERE status IN ('assigned','in_progress')) as active"),
      db.raw("AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_rating")
    );

  res.json({ success: true, data: { ...user, stats } });
});

exports.updateStaff = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (req.user.role === ROLES.STAFF && req.user.id !== targetId) {
    throw createError('Access denied', 403);
  }

  const allowed = ['full_name', 'full_name_ar', 'email'];
  if ([ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) allowed.push('status', 'phone');

  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (req.file) updates.avatar_url = getFileUrl(req, req.file.path);

  const [updated] = await db('users').where('id', targetId).update(updates).returning('*');
  res.json({ success: true, data: updated });
});

exports.deactivateStaff = asyncHandler(async (req, res) => {
  await db('users')
    .where({ id: req.params.id, compound_id: req.user.compound_id, role: ROLES.STAFF })
    .update({ status: 'inactive' });
  res.json({ success: true, message: 'Staff member deactivated.' });
});
