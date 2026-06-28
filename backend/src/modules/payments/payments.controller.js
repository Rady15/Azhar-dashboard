const { db } = require('../../config/database');
const { asyncHandler, createError } = require('../../middleware/errorHandler');
const { PAGINATION } = require('../../config/constants');

// ─────────────────────────────────────────────────────────────
// GET /api/payments/matrix  — admin: annual payment grid
// Shows each tenant × month payment status
// ─────────────────────────────────────────────────────────────
exports.getPaymentMatrix = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;

  const invoices = await db('invoices as i')
    .join('users as u', 'u.id', 'i.tenant_id')
    .join('villas as v', 'v.id', 'i.villa_id')
    .where('i.compound_id', req.user.compound_id)
    .where('i.billing_year', parseInt(year))
    .select('i.*', 'u.full_name as tenant_name', 'v.unit_number as villa')
    .orderBy(['v.unit_number', 'i.billing_month']);

  // Pivot: group by tenant → months array
  const matrix = {};
  for (const inv of invoices) {
    const key = inv.tenant_id;
    if (!matrix[key]) {
      matrix[key] = {
        tenant_id:   inv.tenant_id,
        tenant_name: inv.tenant_name,
        villa:       inv.villa,
        months:      {}
      };
    }
    matrix[key].months[inv.billing_month] = {
      invoice_id:   inv.id,
      invoice_no:   inv.invoice_number,
      status:       inv.status,
      amount:       inv.total_amount,
      paid:         inv.paid_amount,
      due_date:     inv.due_date
    };
  }

  res.json({ success: true, data: Object.values(matrix), year: parseInt(year) });
});

// ─────────────────────────────────────────────────────────────
// GET /api/payments/transactions  — admin: full transaction history
// ─────────────────────────────────────────────────────────────
exports.listTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = PAGINATION.DEFAULT_LIMIT, from_date, to_date, method } = req.query;
  const offset = (page - 1) * Math.min(limit, PAGINATION.MAX_LIMIT);

  let query = db('payments as p')
    .join('users as u', 'u.id', 'p.tenant_id')
    .join('invoices as i', 'i.id', 'p.invoice_id')
    .join('villas as v', 'v.id', 'i.villa_id')
    .where('p.compound_id', req.user.compound_id)
    .select(
      'p.*', 'u.full_name as tenant_name', 'v.unit_number as villa',
      'i.invoice_number', 'i.billing_month', 'i.billing_year'
    );

  if (from_date) query = query.where('p.payment_date', '>=', from_date);
  if (to_date)   query = query.where('p.payment_date', '<=', to_date);
  if (method)    query = query.where('p.payment_method', method);

  const countBase = db('payments as p').where('p.compound_id', req.user.compound_id);
  if (from_date) countBase.where('p.payment_date', '>=', from_date);
  if (to_date)   countBase.where('p.payment_date', '<=', to_date);
  if (method)    countBase.where('p.payment_method', method);
  const [{ count }] = await countBase.clone().count('p.id as count');

  const txns = await query.orderBy('p.payment_date', 'desc').limit(limit).offset(offset);

  // Summary totals for this filter (fresh query, no GROUP BY needed)
  let sumQuery = db('payments as p').where('p.compound_id', req.user.compound_id);
  if (from_date) sumQuery = sumQuery.where('p.payment_date', '>=', from_date);
  if (to_date)   sumQuery = sumQuery.where('p.payment_date', '<=', to_date);
  if (method)    sumQuery = sumQuery.where('p.payment_method', method);
  const [summary] = await sumQuery.sum({ total_collected: 'p.amount' });

  res.json({
    success: true,
    data: txns,
    summary: { total_collected: parseFloat(summary.total_collected || 0) },
    pagination: { total: parseInt(count), page: parseInt(page), limit: parseInt(limit) }
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/payments  — admin: record a manual payment
// ─────────────────────────────────────────────────────────────
exports.addPayment = asyncHandler(async (req, res) => {
  const { invoice_id, amount, payment_method, payment_date, reference_no, notes } = req.body;

  if (!invoice_id || !amount || !payment_date) {
    throw createError('invoice_id, amount, and payment_date are required', 400);
  }

  const invoice = await db('invoices')
    .where({ id: invoice_id, compound_id: req.user.compound_id })
    .first();

  if (!invoice) throw createError('Invoice not found', 404);
  if (invoice.status === 'paid') throw createError('Invoice is already fully paid', 400);

  const [payment] = await db('payments').insert({
    compound_id:    req.user.compound_id,
    invoice_id, amount, payment_method, payment_date, reference_no, notes,
    tenant_id:      invoice.tenant_id,
    recorded_by:    req.user.id
  }).returning('*');

  // Invoice status is auto-updated by the DB trigger

  // Notify the tenant
  await db('notifications').insert({
    user_id:     invoice.tenant_id,
    compound_id: req.user.compound_id,
    type:        'payment_received',
    title:       'Payment Received',
    body:        `Your payment of SAR ${amount} for ${invoice.invoice_number} has been recorded.`,
    data:        JSON.stringify({ payment_id: payment.id, invoice_id })
  });

  res.status(201).json({ success: true, data: payment });
});

// ─────────────────────────────────────────────────────────────
// GET /api/payments/invoices/overdue  — admin: overdue list
// ─────────────────────────────────────────────────────────────
exports.getOverdueInvoices = asyncHandler(async (req, res) => {
  const invoices = await db('invoices as i')
    .join('users as u', 'u.id', 'i.tenant_id')
    .join('villas as v', 'v.id', 'i.villa_id')
    .where('i.compound_id', req.user.compound_id)
    .where('i.status', 'overdue')
    .select(
      'i.*', 'u.full_name as tenant_name', 'u.phone as tenant_phone',
      'u.email as tenant_email', 'v.unit_number as villa'
    )
    .orderBy('i.due_date', 'asc');

  const [{ total_outstanding }] = await db('invoices')
    .where({ compound_id: req.user.compound_id, status: 'overdue' })
    .sum({ total_outstanding: db.raw('total_amount - paid_amount') });

  res.json({
    success: true,
    data: invoices,
    summary: {
      count:            invoices.length,
      total_outstanding: parseFloat(total_outstanding || 0)
    }
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/payments/reminders  — admin: send payment reminders
// ─────────────────────────────────────────────────────────────
exports.sendReminders = asyncHandler(async (req, res) => {
  const { invoice_ids } = req.body; // array of invoice IDs

  if (!Array.isArray(invoice_ids) || invoice_ids.length === 0) {
    throw createError('invoice_ids array is required', 400);
  }

  const invoices = await db('invoices as i')
    .join('users as u', 'u.id', 'i.tenant_id')
    .whereIn('i.id', invoice_ids)
    .where('i.compound_id', req.user.compound_id)
    .select('i.*', 'u.full_name as tenant_name', 'u.email as tenant_email', 'u.id as user_id');

  // Create in-app notifications (email would hook into nodemailer here)
  const notifRows = invoices.map(inv => ({
    user_id:     inv.user_id,
    compound_id: req.user.compound_id,
    type:        'payment_due',
    title:       'Payment Reminder',
    body:        `Your invoice ${inv.invoice_number} of SAR ${inv.total_amount} is due. Please settle at your earliest convenience.`,
    data:        JSON.stringify({ invoice_id: inv.id })
  }));

  if (notifRows.length > 0) {
    await db('notifications').insert(notifRows);
  }

  res.json({
    success: true,
    message: `Reminders sent to ${invoices.length} tenant(s).`,
    sent_to: invoices.map(i => ({ name: i.tenant_name, email: i.tenant_email }))
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/payments/my  — tenant: my payment history
// ─────────────────────────────────────────────────────────────
exports.myPayments = asyncHandler(async (req, res) => {
  const invoices = await db('invoices as i')
    .leftJoin('payments as p', 'p.invoice_id', 'i.id')
    .where('i.tenant_id', req.user.id)
    .select(
      'i.id', 'i.invoice_number', 'i.billing_month', 'i.billing_year',
      'i.due_date', 'i.status', 'i.rent_amount', 'i.total_amount', 'i.paid_amount',
      'p.receipt_number', 'p.payment_date', 'p.payment_method', 'p.id as payment_id'
    )
    .orderBy('i.billing_year', 'desc')
    .orderBy('i.billing_month', 'desc');

  res.json({ success: true, data: invoices });
});

// ─────────────────────────────────────────────────────────────
// GET /api/payments/my/receipts/:id  — tenant: download receipt
// ─────────────────────────────────────────────────────────────
exports.downloadReceipt = asyncHandler(async (req, res) => {
  const payment = await db('payments as p')
    .join('invoices as i', 'i.id', 'p.invoice_id')
    .join('villas as v', 'v.id', 'i.villa_id')
    .join('users as u', 'u.id', 'p.tenant_id')
    .join('compounds as c', 'c.id', 'p.compound_id')
    .where('p.id', req.params.id)
    .where('p.tenant_id', req.user.id)
    .select('p.*', 'i.invoice_number', 'i.billing_month', 'i.billing_year',
            'v.unit_number as villa', 'u.full_name as tenant_name',
            'c.name as compound_name')
    .first();

  if (!payment) throw createError('Receipt not found', 404);

  // Generate simple text receipt (replace with PDFKit for real PDF)
  const receipt = `
=== PAYMENT RECEIPT ===
Receipt No: ${payment.receipt_number}
Date: ${payment.payment_date}

Compound: ${payment.compound_name}
Tenant:   ${payment.tenant_name}
Villa:    ${payment.villa}
Period:   ${payment.billing_month}/${payment.billing_year}
Invoice:  ${payment.invoice_number}

Amount Paid: SAR ${payment.amount}
Method:      ${payment.payment_method}
Reference:   ${payment.reference_no || 'N/A'}

Thank you for your payment.
=======================
  `.trim();

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment.receipt_number}.txt"`);
  res.send(receipt);
});
