const { db } = require('../../config/database');
const { asyncHandler, createError } = require('../../middleware/errorHandler');
const { PAGINATION } = require('../../config/constants');
const { getFileUrl } = require('../../middleware/upload');

// ─────────────────────────────────────────────────────────────
// GET /api/villas  — list all villas with filtering
// ─────────────────────────────────────────────────────────────
exports.listVillas = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = PAGINATION.DEFAULT_LIMIT,
    status, block, villa_type, search
  } = req.query;

  const offset = (page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT);
  const compound_id = req.user.compound_id;

  let query = db('villas as v')
    .leftJoin('leases as l', function () {
      this.on('l.villa_id', 'v.id').andOn('l.status', db.raw("'active'"));
    })
    .leftJoin('users as u', 'u.id', 'l.tenant_id')
    .where('v.compound_id', compound_id)
    .select(
      'v.*',
      'u.full_name as tenant_name',
      'u.phone as tenant_phone',
      'l.monthly_rent as lease_rent',
      'l.end_date as lease_end'
    );

  if (status)     query = query.where('v.status', status);
  if (block)      query = query.where('v.block', block);
  if (villa_type) query = query.where('v.villa_type', villa_type);
  if (search)     query = query.whereILike('v.unit_number', `%${search}%`);

  // Separate count query to avoid GROUP BY issues with JOINs
  const countQuery = db('villas as v')
    .leftJoin('leases as l', function () {
      this.on('l.villa_id', 'v.id').andOn('l.status', db.raw("'active'"));
    })
    .where('v.compound_id', compound_id);

  if (status)     countQuery.where('v.status', status);
  if (block)      countQuery.where('v.block', block);
  if (villa_type) countQuery.where('v.villa_type', villa_type);
  if (search)     countQuery.whereILike('v.unit_number', `%${search}%`);

  const [{ count }] = await countQuery.countDistinct('v.id as count');
  const villas = await query.orderBy('v.unit_number').limit(limit).offset(offset);

  res.json({
    success: true,
    data: villas,
    pagination: {
      total: parseInt(count),
      page:  parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(count / limit)
    }
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/villas  — create a new villa
// ─────────────────────────────────────────────────────────────
exports.createVilla = asyncHandler(async (req, res) => {
  const {
    unit_number, block, villa_type, area_sqm,
    bedrooms, bathrooms, monthly_rent, annual_rent,
    has_garden, has_pool, has_garage, notes
  } = req.body;

  if (!unit_number) throw createError('Unit number is required', 400);

  const existing = await db('villas')
    .where({ compound_id: req.user.compound_id, unit_number })
    .first();
  if (existing) throw createError(`Villa ${unit_number} already exists`, 409);

  // Handle uploaded photos
  const photos = [];
  if (req.files && req.files.length > 0) {
    req.files.forEach(f => photos.push(getFileUrl(req, f.path)));
  }

  const [villa] = await db('villas').insert({
    compound_id: req.user.compound_id,
    unit_number, block, villa_type, area_sqm,
    bedrooms, bathrooms, monthly_rent, annual_rent,
    has_garden, has_pool, has_garage, notes,
    photos: photos.length > 0 ? photos : undefined
  }).returning('*');

  res.status(201).json({ success: true, data: villa });
});

// ─────────────────────────────────────────────────────────────
// GET /api/villas/:id  — single villa with full detail
// ─────────────────────────────────────────────────────────────
exports.getVilla = asyncHandler(async (req, res) => {
  const villa = await db('villas as v')
    .where('v.id', req.params.id)
    .where('v.compound_id', req.user.compound_id)
    .first();

  if (!villa) throw createError('Villa not found', 404);

  // Get current active lease + tenant
  const lease = await db('leases as l')
    .join('users as u', 'u.id', 'l.tenant_id')
    .where('l.villa_id', villa.id)
    .where('l.status', 'active')
    .select('l.*', 'u.full_name as tenant_name', 'u.phone as tenant_phone',
            'u.email as tenant_email', 'u.id as tenant_id')
    .first();

  // Get maintenance stats
  const [maintenanceStats] = await db('maintenance_requests')
    .where('villa_id', villa.id)
    .select(
      db.raw("COUNT(*) FILTER (WHERE status != 'completed') as open_count"),
      db.raw("COUNT(*) FILTER (WHERE status = 'completed') as completed_count")
    );

  res.json({
    success: true,
    data: { ...villa, current_lease: lease || null, maintenance: maintenanceStats }
  });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/villas/:id  — update villa details
// ─────────────────────────────────────────────────────────────
exports.updateVilla = asyncHandler(async (req, res) => {
  const villa = await db('villas')
    .where({ id: req.params.id, compound_id: req.user.compound_id })
    .first();

  if (!villa) throw createError('Villa not found', 404);

  const allowedFields = [
    'block', 'villa_type', 'status', 'area_sqm', 'bedrooms',
    'bathrooms', 'monthly_rent', 'annual_rent', 'has_garden',
    'has_pool', 'has_garage', 'notes'
  ];

  const updates = {};
  allowedFields.forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  // Handle uploaded photos — merge with existing
  let existingPhotos = villa.photos || [];
  if (req.body.remove_photos) {
    const removeIndices = JSON.parse(req.body.remove_photos);
    existingPhotos = existingPhotos.filter((_, i) => !removeIndices.includes(i));
  }
  if (req.files && req.files.length > 0) {
    req.files.forEach(f => existingPhotos.push(getFileUrl(req, f.path)));
  }
  updates.photos = existingPhotos;

  const [updated] = await db('villas')
    .where('id', req.params.id)
    .update(updates)
    .returning('*');

  res.json({ success: true, data: updated });
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/villas/:id  — remove a villa (only if vacant)
// ─────────────────────────────────────────────────────────────
exports.deleteVilla = asyncHandler(async (req, res) => {
  const villa = await db('villas')
    .where({ id: req.params.id, compound_id: req.user.compound_id })
    .first();

  if (!villa) throw createError('Villa not found', 404);
  if (villa.status === 'occupied') {
    throw createError('Cannot delete an occupied villa. End the lease first.', 400);
  }

  await db('villas').where('id', req.params.id).delete();
  res.json({ success: true, message: 'Villa deleted successfully.' });
});
