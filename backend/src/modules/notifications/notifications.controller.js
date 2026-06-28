const { db } = require('../../config/database');
const { asyncHandler, createError } = require('../../middleware/errorHandler');
const { PAGINATION } = require('../../config/constants');

// ─────────────────────────────────────────────────────────────
// GET /api/notifications  — admin: all compound notifications
// ─────────────────────────────────────────────────────────────
exports.myNotifications = asyncHandler(async (req, res) => {
  const { unread_only, compound, page = 1, limit = PAGINATION.DEFAULT_LIMIT, type } = req.query;

  // Admin: compound-level view (all notifications in this compound)
  if (compound === 'true' && ['admin', 'super_admin'].includes(req.user.role)) {
    const offset = (page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT);
    let query = db('notifications').where('compound_id', req.user.compound_id);
    if (type) query = query.where('type', type);
    if (unread_only === 'true') query = query.where('is_read', false);

    const [{ count }] = await query.clone().count({ count: '*' });
    const notifications = await query
      .clone()
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ unread }] = await db('notifications')
      .where({ compound_id: req.user.compound_id, is_read: false })
      .count({ unread: '*' });

    return res.json({
      success: true,
      data: notifications,
      unread_count: parseInt(unread),
      pagination: { total: parseInt(count), page: parseInt(page), limit: parseInt(limit) }
    });
  }

  // Default: user's own notifications
  let query = db('notifications')
    .where('user_id', req.user.id)
    .orderBy('created_at', 'desc')
    .limit(50);

  if (unread_only === 'true') query = query.where('is_read', false);

  const notifications = await query;
  const [{ unread }] = await db('notifications')
    .where({ user_id: req.user.id, is_read: false }).count({ unread: '*' });

  res.json({ success: true, data: notifications, unread_count: parseInt(unread) });
});

exports.markRead = asyncHandler(async (req, res) => {
  await db('notifications')
    .where({ id: req.params.id, user_id: req.user.id })
    .update({ is_read: true, read_at: new Date() });
  res.json({ success: true, message: 'Marked as read.' });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const { count } = await db('notifications')
    .where({ user_id: req.user.id, is_read: false })
    .update({ is_read: true, read_at: new Date() });
  res.json({ success: true, message: 'All notifications marked as read.', count });
});

exports.remove = asyncHandler(async (req, res) => {
  await db('notifications').where({ id: req.params.id, user_id: req.user.id }).delete();
  res.json({ success: true, message: 'Notification removed.' });
});

// Emergency broadcast to ALL users in the compound
exports.broadcast = asyncHandler(async (req, res) => {
  const { title, body, type } = req.body;
  if (!title || !body) throw createError('Title and body are required', 400);

  const users = await db('users')
    .where('compound_id', req.user.compound_id)
    .where('status', 'active')
    .select('id');

  if (users.length === 0) {
    return res.json({ success: true, message: 'No active users found.', sent: 0 });
  }

  const rows = users.map(u => ({
    user_id:     u.id,
    compound_id: req.user.compound_id,
    type:        type || 'emergency',
    title, body,
    data:        JSON.stringify({ broadcast: true })
  }));

  await db('notifications').insert(rows);

  // Also save as an announcement for persistence
  await db('announcements').insert({
    compound_id: req.user.compound_id,
    created_by:  req.user.id,
    title, body,
    type:        'emergency',
    target_all:  true,
    push_sent:   true,
    push_sent_at: new Date(),
    push_count:  users.length
  });

  res.json({ success: true, message: `Emergency broadcast sent to ${users.length} users.`, sent: users.length });
});
