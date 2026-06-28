const { db } = require('../../config/database');
const { asyncHandler, createError } = require('../../middleware/errorHandler');
const { getFileUrl } = require('../../middleware/upload');

// ─────────────────────────────────────────────────────────────
// GET /api/facilities  — list all (admin & tenant)
// ─────────────────────────────────────────────────────────────
exports.listFacilities = asyncHandler(async (req, res) => {
  const facilities = await db('facilities')
    .where('compound_id', req.user.compound_id)
    .orderBy('name');

  res.json({ success: true, data: facilities });
});

// ─────────────────────────────────────────────────────────────
// POST /api/facilities  — admin: create facility
// ─────────────────────────────────────────────────────────────
exports.createFacility = asyncHandler(async (req, res) => {
  const { name, name_ar, description, category, max_capacity, opening_time, closing_time } = req.body;
  if (!name) throw createError('Facility name is required', 400);

  let images = [];
  if (req.files && req.files.length > 0) {
    images = req.files.map(f => getFileUrl(req, f.path));
  }

  const [facility] = await db('facilities').insert({
    compound_id: req.user.compound_id,
    name, name_ar, description, category: category || 'other',
    images, max_capacity: max_capacity || 1,
    opening_time, closing_time
  }).returning('*');

  res.status(201).json({ success: true, data: facility });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/facilities/:id  — admin: update facility
// ─────────────────────────────────────────────────────────────
exports.updateFacility = asyncHandler(async (req, res) => {
  const facility = await db('facilities')
    .where({ id: req.params.id, compound_id: req.user.compound_id })
    .first();
  if (!facility) throw createError('Facility not found', 404);

  const allowed = ['name', 'name_ar', 'description', 'category', 'max_capacity', 'opening_time', 'closing_time', 'is_active'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  let images = facility.images || [];
  if (req.body.remove_images) {
    const idxs = JSON.parse(req.body.remove_images);
    images = images.filter((_, i) => !idxs.includes(i));
  }
  if (req.files && req.files.length > 0) {
    req.files.forEach(f => images.push(getFileUrl(req, f.path)));
  }
  updates.images = images;

  const [updated] = await db('facilities').where('id', req.params.id).update(updates).returning('*');
  res.json({ success: true, data: updated });
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/facilities/:id  — admin: remove
// ─────────────────────────────────────────────────────────────
exports.deleteFacility = asyncHandler(async (req, res) => {
  await db('facilities').where({ id: req.params.id, compound_id: req.user.compound_id }).delete();
  res.json({ success: true, message: 'Facility deleted.' });
});

// ─────────────────────────────────────────────────────────────
// GET /api/facilities/:id/bookings  — admin: bookings for a facility
// ─────────────────────────────────────────────────────────────
exports.listBookings = asyncHandler(async (req, res) => {
  const bookings = await db('facility_bookings as b')
    .join('users as u', 'u.id', 'b.tenant_id')
    .where('b.facility_id', req.params.id)
    .where('b.compound_id', req.user.compound_id)
    .select('b.*', 'u.full_name as tenant_name', 'u.phone as tenant_phone')
    .orderBy('b.booking_date', 'desc')
    .orderBy('b.start_time', 'desc');

  res.json({ success: true, data: bookings });
});

// ─────────────────────────────────────────────────────────────
// POST /api/facilities/:id/book  — tenant: book a facility
// ─────────────────────────────────────────────────────────────
exports.bookFacility = asyncHandler(async (req, res) => {
  const { booking_date, start_time, end_time, notes } = req.body;
  if (!booking_date || !start_time || !end_time) {
    throw createError('booking_date, start_time, and end_time are required', 400);
  }

  const facility = await db('facilities')
    .where({ id: req.params.id, compound_id: req.user.compound_id, is_active: true })
    .first();
  if (!facility) throw createError('Facility not found or inactive', 404);

  // Check for overlapping bookings
  const overlap = await db('facility_bookings')
    .where('facility_id', req.params.id)
    .where('booking_date', booking_date)
    .where('status', '!=', 'cancelled')
    .where(function () {
      this.where(function () {
        this.where('start_time', '<', end_time)
            .where('end_time', '>', start_time);
      });
    })
    .first();

  if (overlap) throw createError('This time slot is already booked', 409);

  const [booking] = await db('facility_bookings').insert({
    compound_id: req.user.compound_id,
    facility_id: req.params.id,
    tenant_id: req.user.id,
    booking_date, start_time, end_time, notes,
    status: 'confirmed'
  }).returning('*');

  res.status(201).json({ success: true, data: booking });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/facilities/bookings/:id/status  — admin: update booking status
// ─────────────────────────────────────────────────────────────
exports.updateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
    throw createError('Invalid status', 400);
  }

  const [updated] = await db('facility_bookings')
    .where({ id: req.params.id, compound_id: req.user.compound_id })
    .update({ status })
    .returning('*');

  if (!updated) throw createError('Booking not found', 404);
  res.json({ success: true, data: updated });
});
