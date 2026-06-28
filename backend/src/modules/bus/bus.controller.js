const { db } = require('../../config/database');
const { asyncHandler, createError } = require('../../middleware/errorHandler');

exports.listRoutes = asyncHandler(async (req, res) => {
  const routes = await db('bus_routes as r')
    .leftJoin('bus_enrollments as e', function () {
      this.on('e.route_id', 'r.id').andOn('e.status', db.raw("'active'"));
    })
    .where('r.compound_id', req.user.compound_id)
    .select('r.*', db.raw('COUNT(e.id) as enrolled_count'))
    .groupBy('r.id')
    .orderBy('r.route_name');

  res.json({ success: true, data: routes });
});

exports.createRoute = asyncHandler(async (req, res) => {
  const { route_name, driver_name, driver_phone, vehicle_plate, departure_time, return_time, school_name, max_capacity } = req.body;
  if (!route_name) throw createError('Route name is required', 400);

  const [route] = await db('bus_routes').insert({
    compound_id: req.user.compound_id,
    route_name, driver_name, driver_phone, vehicle_plate,
    departure_time, return_time, school_name, max_capacity
  }).returning('*');

  res.status(201).json({ success: true, data: route });
});

exports.updateRoute = asyncHandler(async (req, res) => {
  const [updated] = await db('bus_routes')
    .where({ id: req.params.id, compound_id: req.user.compound_id })
    .update(req.body).returning('*');

  if (!updated) throw createError('Route not found', 404);
  res.json({ success: true, data: updated });
});

exports.enrollChild = asyncHandler(async (req, res) => {
  const { route_id, dependent_id, tenant_id, seat_number } = req.body;
  if (!route_id || !dependent_id || !tenant_id) {
    throw createError('route_id, dependent_id, and tenant_id are required', 400);
  }

  // Check capacity
  const route = await db('bus_routes').where('id', route_id).first();
  if (!route) throw createError('Route not found', 404);

  const [{ enrolled }] = await db('bus_enrollments')
    .where({ route_id, status: 'active' }).count({ enrolled: '*' });

  if (parseInt(enrolled) >= route.max_capacity) {
    throw createError('Bus route is at full capacity', 400);
  }

  const [enrollment] = await db('bus_enrollments').insert({
    route_id, dependent_id, tenant_id, seat_number, status: 'active'
  }).returning('*');

  res.status(201).json({ success: true, data: enrollment });
});

exports.updateEnrollment = asyncHandler(async (req, res) => {
  const [updated] = await db('bus_enrollments')
    .where('id', req.params.id).update(req.body).returning('*');
  if (!updated) throw createError('Enrollment not found', 404);
  res.json({ success: true, data: updated });
});

exports.removeEnrollment = asyncHandler(async (req, res) => {
  await db('bus_enrollments').where('id', req.params.id).delete();
  res.json({ success: true, message: 'Enrollment removed.' });
});

exports.listEnrollments = asyncHandler(async (req, res) => {
  const { route_id } = req.query;
  let query = db('bus_enrollments as e')
    .join('dependents as d', 'd.id', 'e.dependent_id')
    .join('bus_routes as r', 'r.id', 'e.route_id')
    .join('users as u', 'u.id', 'e.tenant_id')
    .where('r.compound_id', req.user.compound_id)
    .select(
      'e.id', 'e.route_id', 'e.seat_number', 'e.status',
      'd.full_name as child_name', 'd.school_grade',
      'u.full_name as parent_name', 'u.phone as parent_phone'
    )
    .orderBy('d.full_name');

  if (route_id) query = query.where('e.route_id', route_id);

  const enrollments = await query;
  res.json({ success: true, data: enrollments });
});

exports.mySchedule = asyncHandler(async (req, res) => {
  const enrollments = await db('bus_enrollments as e')
    .join('bus_routes as r', 'r.id', 'e.route_id')
    .join('dependents as d', 'd.id', 'e.dependent_id')
    .where('e.tenant_id', req.user.id)
    .where('e.status', 'active')
    .select(
      'e.id', 'e.seat_number', 'e.status',
      'd.full_name as child_name', 'd.school_grade',
      'r.route_name', 'r.driver_name', 'r.driver_phone',
      'r.vehicle_plate', 'r.departure_time', 'r.return_time', 'r.school_name'
    );

  res.json({ success: true, data: enrollments });
});
