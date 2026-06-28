const { db } = require('../../config/database');
const { asyncHandler, createError } = require('../../middleware/errorHandler');

// ─────────────────────────────────────────────────────────────
// GET /api/announcements  — admin: all
// ─────────────────────────────────────────────────────────────
exports.listAll = asyncHandler(async (req, res) => {
  const announcements = await db('announcements as a')
    .join('users as u', 'u.id', 'a.created_by')
    .where('a.compound_id', req.user.compound_id)
    .select('a.*', 'u.full_name as created_by_name')
    .orderBy('a.created_at', 'desc');

  res.json({ success: true, data: announcements });
});

// ─────────────────────────────────────────────────────────────
// POST /api/announcements  — admin: create and push
// ─────────────────────────────────────────────────────────────
exports.create = asyncHandler(async (req, res) => {
  const { title, title_ar, body, body_ar, type, target_all, target_villas, is_pinned } = req.body;

  if (!title || !body) throw createError('Title and body are required', 400);

  const [announcement] = await db('announcements').insert({
    compound_id:   req.user.compound_id,
    created_by:    req.user.id,
    title, title_ar, body, body_ar,
    type:          type || 'general',
    target_all:    target_all !== false,
    target_villas: target_villas || null,
    is_pinned:     is_pinned === true
  }).returning('*');

  // Determine which tenants to notify
  let tenantsQuery = db('users')
    .where('compound_id', req.user.compound_id)
    .where('role', 'tenant')
    .where('status', 'active');

  if (!announcement.target_all && announcement.target_villas?.length > 0) {
    // Only tenants in specific villas
    tenantsQuery = tenantsQuery
      .join('leases', 'leases.tenant_id', 'users.id')
      .whereIn('leases.villa_id', announcement.target_villas)
      .where('leases.status', 'active')
      .distinct('users.id');
  }

  const tenants = await tenantsQuery.select('users.id');

  if (tenants.length > 0) {
    const notifRows = tenants.map(t => ({
      user_id:     t.id,
      compound_id: req.user.compound_id,
      type:        'announcement',
      title:       title,
      body:        body.substring(0, 150),
      data:        JSON.stringify({ announcement_id: announcement.id })
    }));
    await db('notifications').insert(notifRows);
    await db('announcements').where('id', announcement.id).update({
      push_sent: true, push_sent_at: new Date(), push_count: tenants.length
    });
  }

  res.status(201).json({ success: true, data: announcement, notified: tenants.length });
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/announcements/:id
// ─────────────────────────────────────────────────────────────
exports.remove = asyncHandler(async (req, res) => {
  await db('announcements').where({ id: req.params.id, compound_id: req.user.compound_id }).delete();
  res.json({ success: true, message: 'Announcement removed.' });
});

// ─────────────────────────────────────────────────────────────
// GET /api/announcements/my  — tenant: relevant announcements
// ─────────────────────────────────────────────────────────────
exports.myAnnouncements = asyncHandler(async (req, res) => {
  // Get tenant's villa
  const lease = await db('leases').where({ tenant_id: req.user.id, status: 'active' }).first();

  const announcements = await db('announcements')
    .where('compound_id', req.user.compound_id)
    .where(function () {
      this.where('target_all', true);
      if (lease) {
        this.orWhereRaw('? = ANY(target_villas)', [lease.villa_id]);
      }
    })
    .select('id', 'title', 'title_ar', 'body', 'body_ar', 'type', 'is_pinned', 'created_at')
    .orderBy('is_pinned', 'desc')
    .orderBy('created_at', 'desc')
    .limit(50);

  res.json({ success: true, data: announcements });
});
