const { db } = require('../../config/database');
const { asyncHandler } = require('../../middleware/errorHandler');

// ─────────────────────────────────────────────────────────────
// GET /api/reports/dashboard  — main dashboard KPIs
// Powers the admin web panel dashboard (screen 05)
// ─────────────────────────────────────────────────────────────
exports.getDashboard = asyncHandler(async (req, res) => {
  const cid = req.user.compound_id;

  // Run all queries in parallel for speed
  const [
    villaStats,
    maintenanceStats,
    financialStats,
    recentActivity,
    topStaff
  ] = await Promise.all([

    // Villa occupancy
    db('villas').where('compound_id', cid)
      .select(
        db.raw("COUNT(*) as total"),
        db.raw("COUNT(*) FILTER (WHERE status = 'occupied') as occupied"),
        db.raw("COUNT(*) FILTER (WHERE status = 'vacant') as vacant"),
        db.raw("COUNT(*) FILTER (WHERE status = 'maintenance') as in_maintenance")
      ).first(),

    // Maintenance overview
    db('maintenance_requests').where('compound_id', cid)
      .select(
        db.raw("COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled')) as open"),
        db.raw("COUNT(*) FILTER (WHERE status = 'completed') as completed"),
        db.raw("COUNT(*) FILTER (WHERE priority = 'emergency' AND status NOT IN ('completed','cancelled')) as emergencies"),
        db.raw("AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_rating")
      ).first(),

    // Financial — current month
    db('invoices').where('compound_id', cid)
      .where('billing_month', new Date().getMonth() + 1)
      .where('billing_year', new Date().getFullYear())
      .select(
        db.raw("SUM(total_amount) as expected"),
        db.raw("SUM(paid_amount) as collected"),
        db.raw("SUM(total_amount - paid_amount) as outstanding"),
        db.raw("COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count")
      ).first(),

    // Recent 5 activities (maintenance + payments combined)
    db.raw(`
      (SELECT 'maintenance' as type, ticket_number as ref, status::TEXT, created_at, title as description
       FROM maintenance_requests WHERE compound_id = ? ORDER BY created_at DESC LIMIT 3)
      UNION ALL
      (SELECT 'payment' as type, receipt_number as ref, 'paid'::TEXT as status, created_at, 
              CONCAT('SAR ', amount) as description
       FROM payments WHERE compound_id = ? ORDER BY created_at DESC LIMIT 3)
      ORDER BY created_at DESC LIMIT 5
    `, [cid, cid]),

    // Top performing staff this month
    db('users as u')
      .join('maintenance_requests as m', 'm.assigned_to', 'u.id')
      .where('u.compound_id', cid)
      .where('u.role', 'staff')
      .where('m.status', 'completed')
      .where(db.raw("DATE_TRUNC('month', m.completed_at) = DATE_TRUNC('month', NOW())"))
      .select('u.id', 'u.full_name', db.raw('COUNT(m.id) as completed'), db.raw('ROUND(AVG(m.rating),1) as avg_rating'))
      .groupBy('u.id')
      .orderBy('completed', 'desc')
      .limit(3)
  ]);

  // Monthly revenue for chart (last 12 months)
  const monthlyRevenue = await db.raw(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', p.payment_date), 'Mon YYYY') as month,
      TO_CHAR(DATE_TRUNC('month', p.payment_date), 'YYYY-MM') as month_key,
      SUM(p.amount) as collected
    FROM payments p
    WHERE p.compound_id = ?
      AND p.payment_date >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', p.payment_date)
    ORDER BY DATE_TRUNC('month', p.payment_date)
  `, [cid]);

  res.json({
    success: true,
    data: {
      villas:         villaStats,
      maintenance:    {
        ...maintenanceStats,
        avg_rating: parseFloat(maintenanceStats?.avg_rating || 0).toFixed(1)
      },
      financial:      {
        ...financialStats,
        collection_rate: financialStats?.expected > 0
          ? Math.round((financialStats.collected / financialStats.expected) * 100)
          : 0
      },
      recent_activity: recentActivity.rows,
      top_staff:       topStaff,
      monthly_revenue: monthlyRevenue.rows
    }
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/reports/financial  — detailed financial analytics
// ─────────────────────────────────────────────────────────────
exports.getFinancial = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const cid = req.user.compound_id;

  const monthly = await db('invoices')
    .where({ compound_id: cid, billing_year: parseInt(year) })
    .select(
      'billing_month',
      db.raw('SUM(total_amount) as expected'),
      db.raw('SUM(paid_amount) as collected'),
      db.raw('COUNT(*) as invoice_count'),
      db.raw("COUNT(*) FILTER (WHERE status = 'overdue') as overdue")
    )
    .groupBy('billing_month')
    .orderBy('billing_month');

  const byMethod = await db('payments')
    .where('compound_id', cid)
    .where(db.raw("EXTRACT(YEAR FROM payment_date) = ?", [parseInt(year)]))
    .select('payment_method', db.raw('SUM(amount) as total'), db.raw('COUNT(*) as count'))
    .groupBy('payment_method');

  const topPayers = await db('payments as p')
    .join('users as u', 'u.id', 'p.tenant_id')
    .where('p.compound_id', cid)
    .where(db.raw("EXTRACT(YEAR FROM p.payment_date) = ?", [parseInt(year)]))
    .select('u.full_name', db.raw('SUM(p.amount) as total_paid'))
    .groupBy('u.id', 'u.full_name')
    .orderBy('total_paid', 'desc')
    .limit(5);

  res.json({ success: true, data: { monthly, by_method: byMethod, top_payers: topPayers, year: parseInt(year) } });
});

// ─────────────────────────────────────────────────────────────
// GET /api/reports/maintenance  — maintenance analytics
// ─────────────────────────────────────────────────────────────
exports.getMaintenance = asyncHandler(async (req, res) => {
  const cid = req.user.compound_id;

  const byCategory = await db('maintenance_requests')
    .where('compound_id', cid)
    .select('category', db.raw('COUNT(*) as count'), db.raw("COUNT(*) FILTER (WHERE status = 'completed') as completed"))
    .groupBy('category')
    .orderBy('count', 'desc');

  const byStatus = await db('maintenance_requests')
    .where('compound_id', cid)
    .select('status', db.raw('COUNT(*) as count'))
    .groupBy('status');

  const avgResolution = await db('maintenance_requests')
    .where({ compound_id: cid, status: 'completed' })
    .select(
      db.raw("AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)::numeric(8,1) as avg_hours"),
      db.raw("MIN(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)::numeric(8,1) as min_hours"),
      db.raw("MAX(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)::numeric(8,1) as max_hours")
    )
    .first();

  res.json({ success: true, data: { by_category: byCategory, by_status: byStatus, resolution_times: avgResolution } });
});
