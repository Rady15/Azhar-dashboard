import React, { useState, useEffect } from 'react';
import API from '../services/api';
import Topbar from '../components/Topbar';
import { CreditCard, Bell, DollarSign, AlertCircle, CheckCircle, List, LayoutGrid } from 'lucide-react';

const Payments = () => {
  const [matrix, setMatrix] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'

  
  // Manual Payment Form states
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payRef, setPayRef] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matrixRes, txRes] = await Promise.all([
        API.get('/api/payments/matrix', { params: { year } }),
        API.get('/api/payments/transactions')
      ]);
      if (matrixRes.data.success) setMatrix(matrixRes.data.data);
      if (txRes.data.success) setTransactions(txRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year]);

  const handlePayClick = (invoice) => {
    setSelectedInvoice(invoice);
    setPayAmount(invoice.amount);
    setShowPayModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/api/payments', {
        invoice_id: selectedInvoice.invoice_id,
        amount: payAmount,
        payment_method: payMethod,
        payment_date: new Date(),
        reference_no: payRef
      });
      if (res.data.success) {
        setShowPayModal(false);
        setPayRef('');
        fetchData();
      }
    } catch (err) {
      alert('تعذر تسجيل الدفعة.');
    }
  };

  const sendReminder = async (invoiceId) => {
    try {
      const res = await API.post('/api/payments/reminders', {
        invoice_ids: [invoiceId]
      });
      if (res.data.success) {
        alert('تم إرسال تذكير الدفع للمستأجر عبر الإشعارات بنجاح.');
      }
    } catch (err) {
      alert('تعذر إرسال التذكير.');
    }
  };

  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  return (
    <div style={styles.container}>
      <Topbar title="مصفوفة المدفوعات السنوية" />

      <div style={styles.content}>
        {/* Matrix Card */}
        <div className="glass-panel" style={styles.card}>
          <div style={styles.header}>
            <h3 style={styles.title}>جدول سداد المستحقات لعام {year}</h3>
            <div style={styles.yearSelect}>
              <button onClick={() => setYear(year - 1)} style={styles.yearBtn}>السابق</button>
              <span style={styles.yearText}>{year}</span>
              <button onClick={() => setYear(year + 1)} style={styles.yearBtn}>التالي</button>
            </div>
          </div>

          {loading ? (
            <div style={styles.center}>جاري تحميل المصفوفة المالية...</div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.thFixed}>الفيلا</th>
                    <th style={styles.thFixed}>المستأجر</th>
                    {months.map((m, i) => (
                      <th key={i} style={styles.thMonth}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row.tenant_id} style={styles.trRow}>
                      <td style={styles.tdFixed}><strong>{row.villa}</strong></td>
                      <td style={styles.tdFixed}>{row.tenant_name}</td>
                      {Array.from({ length: 12 }, (_, idx) => {
                        const mIdx = idx + 1;
                        const inv = row.months[mIdx];
                        if (!inv) return <td key={idx} style={styles.tdMonth}>—</td>;

                        let color = '#9ca3af';
                        let bg = 'rgba(255,255,255,0.02)';
                        if (inv.status === 'paid') { color = '#10b981'; bg = '#10b98120'; }
                        if (inv.status === 'overdue') { color = '#ef4444'; bg = '#ef444420'; }
                        if (inv.status === 'pending') { color = '#f59e0b'; bg = '#f59e0b20'; }

                        return (
                          <td key={idx} style={{ ...styles.tdMonth, backgroundColor: bg, color }}>
                            <div style={styles.cellContent}>
                              <span style={{ fontSize: '11px', fontWeight: '600' }}>
                                {inv.status === 'paid' ? 'مدفوع' : inv.status === 'overdue' ? 'متأخر' : 'مستحق'}
                              </span>
                              {inv.status !== 'paid' && (
                                <div style={styles.cellActions}>
                                  <button onClick={() => handlePayClick(inv)} style={styles.payBtn} title="تسجيل سداد">
                                    <DollarSign size={10} />
                                  </button>
                                  <button onClick={() => sendReminder(inv.invoice_id)} style={styles.remindBtn} title="تذكير">
                                    <Bell size={10} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Transactions List */}
        <div className="glass-panel" style={{ ...styles.card, marginTop: '24px' }}>
          <div style={styles.transactionsHeader}>
            <h3 style={styles.sectionTitle}>سجل العمليات المالية الأخيرة</h3>
            <div style={styles.viewToggle}>
              <button onClick={() => setViewMode('table')} style={{ ...styles.toggleBtn, ...(viewMode === 'table' ? styles.toggleActive : {}) }}>
                <List size={16} />
              </button>
              <button onClick={() => setViewMode('card')} style={{ ...styles.toggleBtn, ...(viewMode === 'card' ? styles.toggleActive : {}) }}>
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {viewMode === 'card' ? (
            <div style={styles.cardGrid}>
              {transactions.slice(0, 6).map(tx => (
                <div key={tx.id} style={styles.txCard}>
                  <div style={styles.txCardHeader}>
                    <span style={styles.txReceipt}>🧾 {tx.receipt_number}</span>
                    <span style={styles.txDate}>{new Date(tx.payment_date).toLocaleDateString('ar-SA')}</span>
                  </div>
                  <div style={styles.txCardBody}>
                    <div style={styles.txAmount}>SAR {parseFloat(tx.amount).toLocaleString()}</div>
                    <div style={styles.txDetails}>
                      <span>فيلا {tx.villa}</span> • <span>{tx.tenant_name}</span>
                    </div>
                    <div style={styles.txMethod}>
                      طريقة الدفع: {tx.payment_method === 'bank_transfer' ? 'تحويل بنكي' : tx.payment_method === 'cash' ? 'نقدي' : tx.payment_method}
                    </div>
                    {tx.reference_no && <div style={styles.txRef}>المرجع: {tx.reference_no}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>رقم الإيصال</th>
                  <th style={styles.th}>الفيلا</th>
                  <th style={styles.th}>المستأجر</th>
                  <th style={styles.th}>المبلغ المسدد</th>
                  <th style={styles.th}>طريقة الدفع</th>
                  <th style={styles.th}>المرجع البنكي</th>
                  <th style={styles.th}>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map(tx => (
                  <tr key={tx.id} style={styles.trRow}>
                    <td style={styles.td}><strong>{tx.receipt_number}</strong></td>
                    <td style={styles.td}>{tx.villa}</td>
                    <td style={styles.td}>{tx.tenant_name}</td>
                    <td style={styles.td}><span style={{ color: '#10b981', fontWeight: '600' }}>SAR {parseFloat(tx.amount).toLocaleString()}</span></td>
                    <td style={styles.td}>
                      {tx.payment_method === 'bank_transfer' ? 'تحويل بنكي' : tx.payment_method === 'cash' ? 'نقدي' : tx.payment_method}
                    </td>
                    <td style={styles.td}>{tx.reference_no || '—'}</td>
                    <td style={styles.td}>{new Date(tx.payment_date).toLocaleDateString('ar-SA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>


      {/* Manual Payment Entry Modal */}
      {showPayModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>تسجيل دفعة إيجار يدوية</h3>
            <form onSubmit={handleRecordPayment} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>المبلغ المسدد (SAR)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>طريقة السداد</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  style={styles.input}
                >
                  <option value="bank_transfer">تحويل بنكي مباشر</option>
                  <option value="cash">نقدي (كاش)</option>
                  <option value="check">شيك ورقي</option>
                  <option value="online">سداد أونلاين</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>رقم المرجع أو التحويل</label>
                <input
                  type="text"
                  placeholder="مثال: TXN-998877"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>تأكيد الدفع</button>
                <button type="button" onClick={() => setShowPayModal(false)} style={styles.cancelBtn}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    marginRight: '260px',
    minHeight: '100vh',
    backgroundColor: '#0b0f19',
    fontFamily: 'Zain, sans-serif'
  },
  content: {
    padding: '32px'
  },
  center: {
    padding: '40px',
    textAlign: 'center',
    color: '#9ca3af'
  },
  card: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    direction: 'rtl'
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#f9fafb'
  },
  yearSelect: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  yearBtn: {
    padding: '6px 12px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '6px',
    color: '#9ca3af',
    fontSize: '12px',
    cursor: 'pointer'
  },
  yearText: {
    color: '#f9fafb',
    fontWeight: '700',
    fontSize: '14px'
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '8px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    direction: 'rtl',
    textAlign: 'right'
  },
  thRow: {
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  thFixed: {
    padding: '12px 16px',
    color: '#9ca3af',
    fontSize: '13px',
    fontWeight: '500',
    minWidth: '100px',
    position: 'sticky',
    right: 0,
    backgroundColor: '#111827'
  },
  thMonth: {
    padding: '12px',
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: '500',
    textAlign: 'center',
    minWidth: '85px'
  },
  trRow: {
    borderBottom: '1px solid rgba(255,255,255,0.03)'
  },
  tdFixed: {
    padding: '12px 16px',
    color: '#e5e7eb',
    fontSize: '13px',
    position: 'sticky',
    right: 0,
    backgroundColor: '#111827'
  },
  tdMonth: {
    padding: '8px',
    textAlign: 'center',
    fontSize: '12px'
  },
  cellContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px'
  },
  cellActions: {
    display: 'flex',
    gap: '6px'
  },
  payBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'rgba(59,130,246,0.15)',
    color: '#3b82f6',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  remindBtn: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'rgba(245,158,11,0.15)',
    color: '#f59e0b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#f9fafb',
    textAlign: 'right'
  },
  th: {
    padding: '16px',
    color: '#9ca3af',
    fontWeight: '500',
    fontSize: '13px'
  },
  td: {
    padding: '16px',
    color: '#e5e7eb',
    fontSize: '14px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200
  },
  modalContent: {
    width: '100%',
    maxWidth: '400px',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#f9fafb',
    textAlign: 'right'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    textAlign: 'right'
  },
  label: {
    fontSize: '12px',
    color: '#9ca3af'
  },
  input: {
    height: '42px',
    padding: '0 12px',
    backgroundColor: '#111827',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#f9fafb',
    fontSize: '13px',
    outline: 'none',
    textAlign: 'right'
  },
  modalActions: {
    display: 'flex',
    gap: '12px'
  },
  saveBtn: {
    flex: 1,
    height: '44px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cancelBtn: {
    flex: 1,
    height: '44px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#9ca3af',
    fontWeight: '600',
    cursor: 'pointer'
  },
  transactionsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', direction: 'rtl' },
  viewToggle: { display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' },
  toggleBtn: { width: '34px', height: '34px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  toggleActive: { backgroundColor: '#3b82f6', color: '#fff' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
  txCard: { borderRadius: '12px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '8px' },
  txCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' },
  txReceipt: { fontSize: '13px', fontWeight: '700', color: '#3b82f6' },
  txDate: { fontSize: '12px', color: '#6b7280' },
  txCardBody: { display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' },
  txAmount: { fontSize: '18px', fontWeight: '700', color: '#10b981' },
  txDetails: { fontSize: '13px', color: '#e5e7eb' },
  txMethod: { fontSize: '12px', color: '#9ca3af' },
  txRef: { fontSize: '11px', color: '#6b7280' }
};

export default Payments;
