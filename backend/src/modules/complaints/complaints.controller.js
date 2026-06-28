const { db } = require('../../config/database');
const { asyncHandler, createError } = require('../../middleware/errorHandler');
const { PAGINATION, ROLES } = require('../../config/constants');

// ─────────────────────────────────────────────────────────────
// GET /api/complaints  — admin: list all
// ─────────────────────────────────────────────────────────────
exports.listComplaints = asyncHandler(async (req, res) => {
  const { page = 1, limit = PAGINATION.DEFAULT_LIMIT, status, category } = req.query;
  const offset = (page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT);

  let query = db('complaints as c')
    .leftJoin('users as u', 'u.id', 'c.tenant_id')
    .leftJoin('villas as v', 'v.id', 'c.villa_id')
    .where('c.compound_id', req.user.compound_id)
    .select(
      'c.id', 'c.ticket_number', 'c.category', 'c.status', 'c.is_anonymous',
      'c.subject', 'c.created_at', 'c.resolved_at',
      db.raw("CASE WHEN c.is_anonymous THEN 'Anonymous' ELSE u.full_name END as tenant_name"),
      'v.unit_number as villa'
    );

  if (status)   query = query.where('c.status', status);
  if (category) query = query.where('c.category', category);

  const countBase = db('complaints as c').where('c.compound_id', req.user.compound_id);
  if (status)   countBase.where('c.status', status);
  if (category) countBase.where('c.category', category);
  const [{ count }] = await countBase.count('c.id as count');

  const complaints = await query.orderBy('c.created_at', 'desc').limit(limit).offset(offset);

  res.json({
    success: true, data: complaints,
    pagination: { total: parseInt(count), page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/complaints  — tenant: submit a complaint
// ─────────────────────────────────────────────────────────────
exports.submitComplaint = asyncHandler(async (req, res) => {
  const { category, subject, description, is_anonymous } = req.body;
  if (!subject) throw createError('Subject is required', 400);

  // Get tenant's villa
  const lease = await db('leases').where({ tenant_id: req.user.id, status: 'active' }).first();

  const [complaint] = await db('complaints').insert({
    compound_id:  req.user.compound_id,
    tenant_id:    req.user.id,
    villa_id:     lease?.villa_id || null,
    category:     category || 'other',
    subject, description,
    is_anonymous: is_anonymous === true || is_anonymous === 'true'
  }).returning('*');

  res.status(201).json({ success: true, data: complaint });
});

// ─────────────────────────────────────────────────────────────
// GET /api/complaints/:id  — admin: full complaint detail
// ─────────────────────────────────────────────────────────────
exports.getComplaint = asyncHandler(async (req, res) => {
  const complaint = await db('complaints as c')
    .leftJoin('users as u', 'u.id', 'c.tenant_id')
    .leftJoin('villas as v', 'v.id', 'c.villa_id')
    .where('c.id', req.params.id)
    .select(
      'c.*',
      db.raw("CASE WHEN c.is_anonymous THEN NULL ELSE u.full_name END as tenant_name"),
      db.raw("CASE WHEN c.is_anonymous THEN NULL ELSE u.phone END as tenant_phone"),
      'v.unit_number as villa'
    )
    .first();

  if (!complaint) throw createError('Complaint not found', 404);

  const replies = await db('complaint_replies as r')
    .join('users as u', 'u.id', 'r.sent_by')
    .where('r.complaint_id', complaint.id)
    .where('r.is_internal', false) // exclude internal notes for tenant-facing view
    .select('r.*', 'u.full_name as sender_name', 'u.role as sender_role')
    .orderBy('r.created_at');

  res.json({ success: true, data: { ...complaint, replies } });
});

// ─────────────────────────────────────────────────────────────
// POST /api/complaints/:id/reply  — admin: reply
// ─────────────────────────────────────────────────────────────
exports.replyToComplaint = asyncHandler(async (req, res) => {
  const { message, is_internal } = req.body;
  if (!message) throw createError('Message is required', 400);

  const complaint = await db('complaints').where('id', req.params.id).first();
  if (!complaint) throw createError('Complaint not found', 404);

  const [reply] = await db('complaint_replies').insert({
    complaint_id: complaint.id,
    sent_by:      req.user.id,
    message,
    is_internal:  is_internal === true
  }).returning('*');

  // Update complaint status
  if (complaint.status === 'open') {
    await db('complaints').where('id', complaint.id).update({ status: 'in_review' });
  }

  // Notify tenant (only if not anonymous and not internal)
  if (!complaint.is_anonymous && complaint.tenant_id && !is_internal) {
    await db('notifications').insert({
      user_id:     complaint.tenant_id,
      compound_id: req.user.compound_id,
      type:        'complaint_reply',
      title:       'New Reply on Your Complaint',
      body:        message.substring(0, 100),
      data:        JSON.stringify({ complaint_id: complaint.id })
    });
  }

  res.status(201).json({ success: true, data: reply });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/complaints/:id/resolve  — admin: mark resolved
// ─────────────────────────────────────────────────────────────
exports.resolveComplaint = asyncHandler(async (req, res) => {
  const [updated] = await db('complaints')
    .where('id', req.params.id)
    .update({ status: 'resolved', resolved_at: new Date(), resolved_by: req.user.id })
    .returning('*');

  if (!updated) throw createError('Complaint not found', 404);
  res.json({ success: true, data: updated });
});

// ─────────────────────────────────────────────────────────────
// GET /api/complaints/my/list  — tenant: own complaints
// ─────────────────────────────────────────────────────────────
exports.myComplaints = asyncHandler(async (req, res) => {
  const complaints = await db('complaints')
    .where('tenant_id', req.user.id)
    .select('id', 'ticket_number', 'category', 'status', 'is_anonymous', 'subject', 'created_at', 'resolved_at')
    .orderBy('created_at', 'desc');

  res.json({ success: true, data: complaints });
});
