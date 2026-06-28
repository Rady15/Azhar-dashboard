const bcrypt = require('bcryptjs');
const { db } = require('../../config/database');
const { asyncHandler, createError } = require('../../middleware/errorHandler');
const { PAGINATION, ROLES } = require('../../config/constants');
const { getFileUrl } = require('../../middleware/upload');

// ─────────────────────────────────────────────────────────────
// GET /api/tenants  — list all tenants (admin)
// ─────────────────────────────────────────────────────────────
exports.listTenants = asyncHandler(async (req, res) => {
  const { page = 1, limit = PAGINATION.DEFAULT_LIMIT, search, status } = req.query;
  const offset = (page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT);

  let query = db('users as u')
    .leftJoin('leases as l', function () {
      this.on('l.tenant_id', 'u.id').andOn('l.status', db.raw("'active'"));
    })
    .leftJoin('villas as v', 'v.id', 'l.villa_id')
    .where('u.compound_id', req.user.compound_id)
    .where('u.role', ROLES.TENANT)
    .select(
      'u.id', 'u.full_name', 'u.full_name_ar', 'u.email', 'u.phone',
      'u.national_id', 'u.nationality', 'u.avatar_url', 'u.status',
      'u.created_at', 'v.unit_number as villa', 'l.monthly_rent', 'l.end_date as lease_end'
    );

  if (status) query = query.where('u.status', status);
  if (search) {
    query = query.where(function () {
      this.whereILike('u.full_name', `%${search}%`)
        .orWhereILike('u.phone', `%${search}%`)
        .orWhereILike('u.email', `%${search}%`)
        .orWhereILike('v.unit_number', `%${search}%`);
    });
  }

  const totalCount = await db('users as u')
    .leftJoin('leases as l', function () {
      this.on('l.tenant_id', 'u.id').andOn('l.status', db.raw("'active'"));
    })
    .leftJoin('villas as v', 'v.id', 'l.villa_id')
    .where('u.compound_id', req.user.compound_id)
    .where('u.role', ROLES.TENANT)
    .modify(q => {
      if (status) q.where('u.status', status);
      if (search) q.where(function () {
        this.whereILike('u.full_name', `%${search}%`)
          .orWhereILike('u.phone', `%${search}%`)
          .orWhereILike('u.email', `%${search}%`);
      });
    })
    .countDistinct('u.id as count')
    .then(r => parseInt(r[0].count));

  const tenants = await query.orderBy('u.created_at', 'desc').limit(limit).offset(offset);

  res.json({
    success: true,
    data: tenants,
    pagination: { total: totalCount, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(totalCount / limit) }
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/tenants  — create tenant + lease (admin)
// ─────────────────────────────────────────────────────────────
exports.createTenant = asyncHandler(async (req, res) => {
  const {
    full_name, full_name_ar, email, phone, national_id, nationality,
    password, villa_id, start_date, end_date, monthly_rent, security_deposit, payment_due_day
  } = req.body;

  if (!full_name || !phone || !password || !villa_id || !start_date || !end_date || !monthly_rent) {
    throw createError('Missing required fields', 400);
  }

  // Check phone uniqueness
  const existing = await db('users').where('phone', phone).first();
  if (existing) throw createError('Phone number already registered', 409);

  const passwordHash = await bcrypt.hash(password, 12);

  const avatar_url = req.file ? getFileUrl(req, req.file.path) : undefined;

  const result = await db.transaction(async trx => {
    const [user] = await trx('users').insert({
      compound_id:   req.user.compound_id,
      role:          ROLES.TENANT,
      full_name, full_name_ar, email, phone, national_id, nationality,
      password_hash: passwordHash,
      avatar_url
    }).returning('id', 'full_name', 'email', 'phone', 'role', 'avatar_url');

    // Create lease
    const [lease] = await trx('leases').insert({
      compound_id:      req.user.compound_id,
      villa_id,
      tenant_id:        user.id,
      start_date, end_date, monthly_rent,
      security_deposit: security_deposit || 0,
      payment_due_day:  payment_due_day || 1,
      status:           'active',
      created_by:       req.user.id
    }).returning('*');

    return { user, lease };
  });

  res.status(201).json({ success: true, data: result });
});

// ─────────────────────────────────────────────────────────────
// GET /api/tenants/:id  — single tenant profile
// Tenants can only see their own profile
// ─────────────────────────────────────────────────────────────
exports.getTenant = asyncHandler(async (req, res) => {
  const targetId = req.params.id;

  // Tenants can only view themselves
  if (req.user.role === ROLES.TENANT && req.user.id !== targetId) {
    throw createError('Access denied', 403);
  }

  const user = await db('users')
    .where('id', targetId)
    .where('compound_id', req.user.compound_id)
    .select('id', 'full_name', 'full_name_ar', 'email', 'phone', 'national_id',
            'nationality', 'avatar_url', 'status', 'created_at')
    .first();

  if (!user) throw createError('Tenant not found', 404);

  // Get dependents count
  const [{ count: dependents_count }] = await db('dependents')
    .where('tenant_id', targetId).count();

  res.json({ success: true, data: { ...user, dependents_count: parseInt(dependents_count) } });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/tenants/:id  — update tenant profile
// ─────────────────────────────────────────────────────────────
exports.updateTenant = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (req.user.role === ROLES.TENANT && req.user.id !== targetId) {
    throw createError('Access denied', 403);
  }

  const allowed = ['full_name', 'full_name_ar', 'email', 'national_id', 'nationality'];
  if ([ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
    allowed.push('status', 'phone');
  }

  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (req.file) updates.avatar_url = getFileUrl(req, req.file.path);

  const [updated] = await db('users').where('id', targetId).update(updates)
    .returning('id', 'full_name', 'email', 'phone', 'status', 'avatar_url');

  res.json({ success: true, data: updated });
});

// ─────────────────────────────────────────────────────────────
// GET /api/tenants/:id/dependents
// ─────────────────────────────────────────────────────────────
exports.listDependents = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (req.user.role === ROLES.TENANT && req.user.id !== targetId) {
    throw createError('Access denied', 403);
  }

  const dependents = await db('dependents')
    .where('tenant_id', targetId)
    .orderBy('date_of_birth');

  res.json({ success: true, data: dependents });
});

// ─────────────────────────────────────────────────────────────
// POST /api/tenants/:id/dependents
// ─────────────────────────────────────────────────────────────
exports.addDependent = asyncHandler(async (req, res) => {
  const { full_name, full_name_ar, relation, date_of_birth, national_id, school_name, school_grade } = req.body;

  if (!full_name || !relation) throw createError('Name and relation are required', 400);

  const avatar_url = req.file ? getFileUrl(req, req.file.path) : undefined;

  const [dep] = await db('dependents').insert({
    tenant_id:   req.params.id,
    compound_id: req.user.compound_id,
    full_name, full_name_ar, relation, date_of_birth, national_id, school_name, school_grade,
    avatar_url
  }).returning('*');

  res.status(201).json({ success: true, data: dep });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/tenants/:id/dependents/:depId
// ─────────────────────────────────────────────────────────────
exports.updateDependent = asyncHandler(async (req, res) => {
  const dep = await db('dependents').where({ id: req.params.depId, tenant_id: req.params.id }).first();
  if (!dep) throw createError('Dependent not found', 404);

  const updates = { ...req.body };
  if (req.file) updates.avatar_url = getFileUrl(req, req.file.path);
  if (updates.date_of_birth === '') updates.date_of_birth = null;

  const [updated] = await db('dependents').where('id', req.params.depId).update(updates).returning('*');
  res.json({ success: true, data: updated });
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/tenants/:id/dependents/:depId
// ─────────────────────────────────────────────────────────────
exports.removeDependent = asyncHandler(async (req, res) => {
  await db('dependents').where({ id: req.params.depId, tenant_id: req.params.id }).delete();
  res.json({ success: true, message: 'Dependent removed.' });
});

// ─────────────────────────────────────────────────────────────
// GET /api/tenants/:id/lease
// ─────────────────────────────────────────────────────────────
exports.getTenantLease = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (req.user.role === ROLES.TENANT && req.user.id !== targetId) {
    throw createError('Access denied', 403);
  }

  const lease = await db('leases as l')
    .join('villas as v', 'v.id', 'l.villa_id')
    .where('l.tenant_id', targetId)
    .where('l.status', 'active')
    .select('l.*', 'v.unit_number', 'v.block', 'v.bedrooms', 'v.bathrooms', 'v.area_sqm')
    .first();

  if (!lease) throw createError('No active lease found', 404);

  // Calculate lease progress
  const total  = new Date(lease.end_date) - new Date(lease.start_date);
  const elapsed = new Date() - new Date(lease.start_date);
  const progress = Math.min(100, Math.round((elapsed / total) * 100));

  res.json({ success: true, data: { ...lease, progress_pct: progress } });
});
