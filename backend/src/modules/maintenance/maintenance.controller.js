const { db } = require('../../config/database');
const { asyncHandler, createError } = require('../../middleware/errorHandler');
const { PAGINATION, ROLES, MAINTENANCE_STATUS } = require('../../config/constants');
const { getFileUrl } = require('../../middleware/upload');

// ─────────────────────────────────────────────────────────────
// GET /api/maintenance  — admin: list all requests
// ─────────────────────────────────────────────────────────────
exports.listAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = PAGINATION.DEFAULT_LIMIT, status, priority, category, search, assigned_to } = req.query;
  const offset = (page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT);

  let query = db('maintenance_requests as m')
    .leftJoin('users as tenant', 'tenant.id', 'm.tenant_id')
    .leftJoin('users as staff', 'staff.id', 'm.assigned_to')
    .leftJoin('villas as v', 'v.id', 'm.villa_id')
    .where('m.compound_id', req.user.compound_id)
    .select(
      'm.id', 'm.ticket_number', 'm.category', 'm.priority', 'm.status',
      'm.title', 'm.created_at', 'm.completed_at',
      'tenant.full_name as tenant_name', 'tenant.phone as tenant_phone',
      'staff.full_name as staff_name',
      'v.unit_number as villa'
    );

  if (status)      query = query.where('m.status', status);
  if (priority)    query = query.where('m.priority', priority);
  if (category)    query = query.where('m.category', category);
  if (assigned_to) query = query.where('m.assigned_to', assigned_to);
  if (search)      query = query.whereILike('m.title', `%${search}%`)
                                .orWhereILike('m.ticket_number', `%${search}%`);

  const countBase = db('maintenance_requests as m').where('m.compound_id', req.user.compound_id);
  if (status)      countBase.where('m.status', status);
  if (priority)    countBase.where('m.priority', priority);
  if (category)    countBase.where('m.category', category);
  if (assigned_to) countBase.where('m.assigned_to', assigned_to);
  if (search)      countBase.whereILike('m.title', `%${search}%`);
  const [{ count }] = await countBase.count('m.id as count');

  const requests = await query.orderBy('m.created_at', 'desc').limit(limit).offset(offset);

  res.json({
    success: true, data: requests,
    pagination: { total: parseInt(count), page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/maintenance  — tenant: submit a new request
// ─────────────────────────────────────────────────────────────
exports.submitRequest = asyncHandler(async (req, res) => {
  const { category, title, description, priority, preferred_date, preferred_time } = req.body;

  if (!category || !title) throw createError('Category and title are required', 400);

  // Find tenant's active villa
  const lease = await db('leases')
    .where('tenant_id', req.user.id)
    .where('status', 'active')
    .first();

  const [request] = await db('maintenance_requests').insert({
    compound_id: req.user.compound_id,
    villa_id:    lease?.villa_id || null,
    tenant_id:   req.user.id,
    category, title, description,
    priority:   priority || 'medium',
    preferred_date, preferred_time
  }).returning('*');

  // Save uploaded before-photos
  if (req.files && req.files.length > 0) {
    const mediaRows = req.files.map(f => ({
      request_id:   request.id,
      uploaded_by:  req.user.id,
      phase:        'before',
      file_url:     getFileUrl(req, f.path),
      file_type:    f.mimetype,
      file_size_kb: Math.round(f.size / 1024)
    }));
    await db('maintenance_media').insert(mediaRows);
  }

  // Create notification for admins
  await notifyAdmins(req.user.compound_id, {
    type:  'maintenance_update',
    title: 'New Maintenance Request',
    body:  `${request.ticket_number}: ${title}`,
    data:  { request_id: request.id }
  });

  res.status(201).json({ success: true, data: request });
});

// ─────────────────────────────────────────────────────────────
// GET /api/maintenance/:id  — ticket details with media and timeline
// ─────────────────────────────────────────────────────────────
exports.getTicket = asyncHandler(async (req, res) => {
  const request = await db('maintenance_requests as m')
    .leftJoin('users as tenant', 'tenant.id', 'm.tenant_id')
    .leftJoin('users as staff', 'staff.id', 'm.assigned_to')
    .leftJoin('villas as v', 'v.id', 'm.villa_id')
    .where('m.id', req.params.id)
    .select(
      'm.*',
      'tenant.full_name as tenant_name', 'tenant.phone as tenant_phone',
      'staff.full_name as staff_name', 'staff.phone as staff_phone',
      'v.unit_number as villa', 'v.block'
    )
    .first();

  if (!request) throw createError('Request not found', 404);

  // Access control: tenants can only see their own requests
  if (req.user.role === ROLES.TENANT && request.tenant_id !== req.user.id) {
    throw createError('Access denied', 403);
  }
  // Staff can only see assigned requests
  if (req.user.role === ROLES.STAFF && request.assigned_to !== req.user.id) {
    throw createError('Access denied', 403);
  }

  const media   = await db('maintenance_media').where('request_id', request.id).orderBy('created_at');
  const timelog = await db('job_time_logs').where('request_id', request.id).first();

  res.json({ success: true, data: { ...request, media, timelog: timelog || null } });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/maintenance/:id/assign  — admin: assign to a technician
// ─────────────────────────────────────────────────────────────
exports.assignTechnician = asyncHandler(async (req, res) => {
  const { staff_id, scheduled_at } = req.body;
  if (!staff_id) throw createError('staff_id is required', 400);

  // Verify staff exists
  const staff = await db('users').where({ id: staff_id, role: ROLES.STAFF }).first();
  if (!staff) throw createError('Staff member not found', 404);

  const [updated] = await db('maintenance_requests')
    .where('id', req.params.id)
    .update({ assigned_to: staff_id, status: MAINTENANCE_STATUS.ASSIGNED, scheduled_at })
    .returning('*');

  // Notify the assigned staff member
  await db('notifications').insert({
    user_id:     staff_id,
    compound_id: req.user.compound_id,
    type:        'assignment',
    title:       'New Job Assigned',
    body:        `You have been assigned to ${updated.ticket_number}`,
    data:        JSON.stringify({ request_id: updated.id })
  });

  // Notify tenant
  await db('notifications').insert({
    user_id:     updated.tenant_id,
    compound_id: req.user.compound_id,
    type:        'maintenance_update',
    title:       'Technician Assigned',
    body:        `A technician has been assigned to your request ${updated.ticket_number}`,
    data:        JSON.stringify({ request_id: updated.id })
  });

  res.json({ success: true, data: updated });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/maintenance/:id/start  — staff: start the job
// ─────────────────────────────────────────────────────────────
exports.startJob = asyncHandler(async (req, res) => {
  const request = await db('maintenance_requests')
    .where({ id: req.params.id, assigned_to: req.user.id })
    .first();

  if (!request) throw createError('Request not found or not assigned to you', 404);
  if (request.status !== MAINTENANCE_STATUS.ASSIGNED) {
    throw createError('Request is not in assigned state', 400);
  }

  const now = new Date();

  await db.transaction(async trx => {
    await trx('maintenance_requests')
      .where('id', request.id)
      .update({ status: MAINTENANCE_STATUS.IN_PROGRESS });

    await trx('job_time_logs').insert({
      request_id: request.id,
      staff_id:   req.user.id,
      started_at: now
    });
  });

  // Notify tenant
  await db('notifications').insert({
    user_id:     request.tenant_id,
    compound_id: req.user.compound_id,
    type:        'maintenance_update',
    title:       'Work Has Started',
    body:        `The technician has started working on ${request.ticket_number}`,
    data:        JSON.stringify({ request_id: request.id })
  });

  res.json({ success: true, message: 'Job started.', started_at: now });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/maintenance/:id/complete  — staff: complete job with after-photos
// ─────────────────────────────────────────────────────────────
exports.completeJob = asyncHandler(async (req, res) => {
  const { technician_notes, tenant_signature } = req.body;

  const request = await db('maintenance_requests')
    .where({ id: req.params.id, assigned_to: req.user.id })
    .first();

  if (!request) throw createError('Request not found or not assigned to you', 404);

  const now = new Date();

  await db.transaction(async trx => {
    await trx('maintenance_requests')
      .where('id', request.id)
      .update({ status: MAINTENANCE_STATUS.COMPLETED, technician_notes });

    // Update time log
    const timeLog = await trx('job_time_logs').where('request_id', request.id).first();
    if (timeLog) {
      const minutes = Math.round((now - new Date(timeLog.started_at)) / 60000);
      await trx('job_time_logs').where('id', timeLog.id)
        .update({ completed_at: now, duration_minutes: minutes, tenant_signature, notes: technician_notes });
    }

    // Save after-photos
    if (req.files && req.files.length > 0) {
      const mediaRows = req.files.map(f => ({
        request_id:   request.id,
        uploaded_by:  req.user.id,
        phase:        'after',
        file_url:     getFileUrl(req, f.path),
        file_type:    f.mimetype,
        file_size_kb: Math.round(f.size / 1024)
      }));
      await trx('maintenance_media').insert(mediaRows);
    }
  });

  // Notify tenant to rate the service
  await db('notifications').insert({
    user_id:     request.tenant_id,
    compound_id: req.user.compound_id,
    type:        'maintenance_update',
    title:       'Request Completed — Please Rate!',
    body:        `Your request ${request.ticket_number} has been completed. Tap to rate the service.`,
    data:        JSON.stringify({ request_id: request.id, action: 'rate' })
  });

  res.json({ success: true, message: 'Job completed successfully.' });
});

// ─────────────────────────────────────────────────────────────
// POST /api/maintenance/:id/rate  — tenant: rate completed service
// ─────────────────────────────────────────────────────────────
exports.rateService = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw createError('Rating must be between 1 and 5', 400);
  }

  const request = await db('maintenance_requests')
    .where({ id: req.params.id, tenant_id: req.user.id, status: MAINTENANCE_STATUS.COMPLETED })
    .first();

  if (!request) throw createError('Request not found or not completed', 404);
  if (request.rated_at) throw createError('Already rated', 400);

  await db('maintenance_requests').where('id', request.id).update({
    rating, rating_comment: comment, rated_at: new Date()
  });

  res.json({ success: true, message: 'Thank you for your feedback!' });
});

// ─────────────────────────────────────────────────────────────
// GET /api/maintenance/staff/my-tasks  — staff: today's tasks
// ─────────────────────────────────────────────────────────────
exports.myTasks = asyncHandler(async (req, res) => {
  const tasks = await db('maintenance_requests as m')
    .leftJoin('villas as v', 'v.id', 'm.villa_id')
    .leftJoin('users as t', 't.id', 'm.tenant_id')
    .where('m.assigned_to', req.user.id)
    .whereIn('m.status', [MAINTENANCE_STATUS.ASSIGNED, MAINTENANCE_STATUS.IN_PROGRESS])
    .select('m.*', 'v.unit_number as villa', 'v.block', 't.full_name as tenant_name', 't.phone as tenant_phone')
    .orderBy('m.priority', 'desc')
    .orderBy('m.created_at', 'asc');

  res.json({ success: true, data: tasks });
});

// ─────────────────────────────────────────────────────────────
// GET /api/maintenance/staff/completed  — staff: job history
// ─────────────────────────────────────────────────────────────
exports.completedJobs = asyncHandler(async (req, res) => {
  const { page = 1, limit = PAGINATION.DEFAULT_LIMIT } = req.query;
  const offset = (page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT);

  const [{ count }] = await db('maintenance_requests')
    .where({ assigned_to: req.user.id, status: MAINTENANCE_STATUS.COMPLETED })
    .count();

  const jobs = await db('maintenance_requests as m')
    .leftJoin('villas as v', 'v.id', 'm.villa_id')
    .where('m.assigned_to', req.user.id)
    .where('m.status', MAINTENANCE_STATUS.COMPLETED)
    .select('m.id', 'm.ticket_number', 'm.category', 'm.title', 'm.completed_at',
            'm.rating', 'v.unit_number as villa')
    .orderBy('m.completed_at', 'desc')
    .limit(limit).offset(offset);

  res.json({
    success: true, data: jobs,
    pagination: { total: parseInt(count), page: parseInt(page), limit: parseInt(limit) }
  });
});

// ─── Internal helper ───────────────────────────────────────
async function notifyAdmins(compound_id, notif) {
  const admins = await db('users')
    .where('compound_id', compound_id)
    .whereIn('role', [ROLES.ADMIN, ROLES.SUPER_ADMIN])
    .select('id');

  if (admins.length === 0) return;

  const rows = admins.map(a => ({
    user_id:     a.id,
    compound_id,
    type:        notif.type,
    title:       notif.title,
    body:        notif.body,
    data:        JSON.stringify(notif.data || {})
  }));

  await db('notifications').insert(rows);
}
