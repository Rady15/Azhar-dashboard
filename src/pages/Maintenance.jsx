import React, { useState, useEffect } from 'react';
import API from '../services/api';
import Topbar from '../components/Topbar';
import { Wrench, CheckCircle, Clock, AlertTriangle, UserPlus, List, LayoutGrid, Award, Calendar } from 'lucide-react';

const Maintenance = () => {
  const [requests, setRequests] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'
  
  // Assign modal state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [assignedStaff, setAssignedStaff] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, staffRes] = await Promise.all([
        API.get('/api/maintenance', { params: { status: statusFilter } }),
        API.get('/api/staff')
      ]);
      if (reqRes.data.success) setRequests(reqRes.data.data);
      if (staffRes.data.success) setStaffList(staffRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignedStaff) return;
    try {
      const res = await API.put(`/api/maintenance/${selectedTicket.id}/assign`, {
        staff_id: assignedStaff,
        scheduled_at: new Date()
      });
      if (res.data.success) {
        setSelectedTicket(null);
        setAssignedStaff('');
        fetchData();
      }
    } catch (err) {
      alert('تعذر تعيين الفني.');
    }
  };

  const getPriorityColor = (prio) => {
    switch (prio) {
      case 'emergency': return { color: '#ef4444', bg: '#ef444420' };
      case 'high':      return { color: '#f59e0b', bg: '#f59e0b20' };
      case 'medium':    return { color: '#3b82f6', bg: '#3b82f620' };
      default:          return { color: '#10b981', bg: '#10b98120' };
    }
  };

  const translateCategory = (cat) => {
    const cats = {
      plumbing: 'سباكة',
      electrical: 'كهرباء',
      ac_hvac: 'تكييف',
      painting: 'دهانات',
      carpentry: 'نجارة',
      cleaning: 'تنظيف',
      pest_control: 'مكافحة حشرات',
      appliances: 'أجهزة منزلية',
      security: 'أمن وسحابة'
    };
    return cats[cat] || cat;
  };

  const translateStatus = (stat) => {
    const stats = {
      submitted: 'تم التقديم',
      pending: 'معلق',
      assigned: 'تم التعيين',
      in_progress: 'جاري العمل',
      completed: 'مكتمل',
      cancelled: 'ملغي'
    };
    return stats[stat] || stat;
  };

  return (
    <div style={styles.container}>
      <Topbar title="مركز الصيانة" />

      <div style={styles.content}>
        <div style={styles.actionsBar}>
          <div style={styles.filters}>
            <button 
              onClick={() => setStatusFilter('')} 
              style={{ ...styles.filterTab, borderBottom: statusFilter === '' ? '2px solid #3b82f6' : 'none' }}
            >
              الكل
            </button>
            <button 
              onClick={() => setStatusFilter('submitted')} 
              style={{ ...styles.filterTab, borderBottom: statusFilter === 'submitted' ? '2px solid #3b82f6' : 'none' }}
            >
              الطلبات الجديدة
            </button>
            <button 
              onClick={() => setStatusFilter('in_progress')} 
              style={{ ...styles.filterTab, borderBottom: statusFilter === 'in_progress' ? '2px solid #3b82f6' : 'none' }}
            >
              جاري تنفيذها
            </button>
            <button 
              onClick={() => setStatusFilter('completed')} 
              style={{ ...styles.filterTab, borderBottom: statusFilter === 'completed' ? '2px solid #3b82f6' : 'none' }}
            >
              المكتملة
            </button>
          </div>

          <div style={styles.viewToggle}>
            <button onClick={() => setViewMode('table')} style={{ ...styles.toggleBtn, ...(viewMode === 'table' ? styles.toggleActive : {}) }}>
              <List size={16} />
            </button>
            <button onClick={() => setViewMode('card')} style={{ ...styles.toggleBtn, ...(viewMode === 'card' ? styles.toggleActive : {}) }}>
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>


        {loading ? (
          <div style={styles.center}>جاري تحميل طلبات الصيانة...</div>
        ) : viewMode === 'card' ? (
          <div style={styles.cardGrid}>
            {requests.map((req) => {
              const prioStyle = getPriorityColor(req.priority);
              return (
                <div key={req.id} className="glass-panel" style={styles.reqCard}>
                  <div style={styles.cardHeader}>
                    <span style={styles.cardTicket}>{req.ticket_number}</span>
                    <span style={{ ...styles.badge, backgroundColor: prioStyle.bg, color: prioStyle.color }}>
                      {req.priority === 'emergency' ? 'طارئ' : req.priority === 'high' ? 'عالي' : req.priority === 'medium' ? 'متوسط' : 'منخفض'}
                    </span>
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.cardVilla}>فيلا {req.villa} • {translateCategory(req.category)}</div>
                    <h4 style={styles.cardTitle}>{req.title}</h4>
                    <p style={styles.cardDesc}>{req.description}</p>
                    <div style={styles.cardMeta}>
                      <span style={styles.cardMetaItem}><Calendar size={12} style={{ marginLeft: '4px' }} /> {new Date(req.created_at).toLocaleDateString('ar-SA')}</span>
                      {req.rating && <span style={styles.cardMetaItem}>⭐ {req.rating}</span>}
                    </div>
                    <div style={styles.cardStaff}>
                      <span style={{ color: req.staff_name ? '#3b82f6' : '#ef4444' }}>
                        👤 {req.staff_name || 'غير معين'}
                      </span>
                    </div>
                  </div>
                  <div style={styles.cardFooter}>
                    <span style={styles.statusSpan}>الحالة: {translateStatus(req.status)}</span>
                    {!req.staff_name && req.status !== 'completed' && (
                      <button onClick={() => setSelectedTicket(req)} style={styles.assignBtn}>
                        <UserPlus size={14} style={{ marginLeft: '4px' }} />
                        <span>تعيين</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel" style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>رقم التذكرة</th>
                  <th style={styles.th}>الفيلا</th>
                  <th style={styles.th}>القسم</th>
                  <th style={styles.th}>الأولوية</th>
                  <th style={styles.th}>العنوان</th>
                  <th style={styles.th}>الفني المعين</th>
                  <th style={styles.th}>الحالة</th>
                  <th style={styles.th}>التاريخ</th>
                  <th style={styles.th}>التقييم</th>
                  <th style={styles.th}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const prioStyle = getPriorityColor(req.priority);
                  return (
                    <tr key={req.id} style={styles.trRow}>
                      <td style={styles.td}><strong>{req.ticket_number}</strong></td>
                      <td style={styles.td}>{req.villa}</td>
                      <td style={styles.td}>{translateCategory(req.category)}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, backgroundColor: prioStyle.bg, color: prioStyle.color }}>
                          {req.priority === 'emergency' ? 'طارئ' : req.priority === 'high' ? 'عالي' : req.priority === 'medium' ? 'متوسط' : 'منخفض'}
                        </span>
                      </td>
                      <td style={styles.td}>{req.title}</td>
                      <td style={styles.td}>{req.staff_name || <span style={{ color: '#ef4444' }}>لم يعين بعد</span>}</td>
                      <td style={styles.td}>
                        <span style={styles.statusSpan}>{translateStatus(req.status)}</span>
                      </td>
                      <td style={styles.td}>{new Date(req.created_at).toLocaleDateString('ar-SA')}</td>
                      <td style={styles.td}>{req.rating ? `⭐ ${req.rating}` : '—'}</td>
                      <td style={styles.td}>
                        {!req.staff_name && req.status !== 'completed' && (
                          <button 
                            onClick={() => setSelectedTicket(req)} 
                            style={styles.assignBtn}
                            title="تعيين فني"
                          >
                            <UserPlus size={16} style={{ marginLeft: '4px' }} />
                            <span>تعيين</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {selectedTicket && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>تعيين فني للطلب {selectedTicket.ticket_number}</h3>
            <form onSubmit={handleAssign} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>اختر فني الصيانة</label>
                <select
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                  style={styles.selectInput}
                  required
                >
                  <option value="">-- اختر الفني --</option>
                  {staffList.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name} ({staff.active_jobs} مهام حالية)
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>تعيين المهمة</button>
                <button type="button" onClick={() => setSelectedTicket(null)} style={styles.cancelBtn}>إلغاء</button>
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
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  center: {
    padding: '40px',
    textAlign: 'center',
    color: '#9ca3af'
  },
  actionsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  filters: {
    display: 'flex',
    gap: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    width: '100%'
  },
  filterTab: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#9ca3af',
    padding: '12px 8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tableCard: {
    overflowX: 'auto',
    borderRadius: '12px'
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
  th: {
    padding: '16px',
    color: '#9ca3af',
    fontWeight: '500',
    fontSize: '13px'
  },
  trRow: {
    borderBottom: '1px solid rgba(255,255,255,0.03)'
  },
  td: {
    padding: '16px',
    color: '#e5e7eb',
    fontSize: '14px'
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block'
  },
  statusSpan: {
    color: '#9ca3af'
  },
  assignBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    border: 'none',
    color: '#3b82f6',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
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
    maxWidth: '420px',
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
    gap: '20px'
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
  selectInput: {
    height: '42px',
    padding: '0 12px',
    backgroundColor: '#111827',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#f9fafb',
    fontSize: '13px',
    outline: 'none',
    textAlign: 'right',
    cursor: 'pointer'
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
  viewToggle: { display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' },
  toggleBtn: { width: '34px', height: '34px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  toggleActive: { backgroundColor: '#3b82f6', color: '#fff' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  reqCard: { borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(255,255,255,0.07)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' },
  cardTicket: { fontSize: '13px', fontWeight: '700', color: '#3b82f6' },
  cardBody: { display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' },
  cardVilla: { fontSize: '12px', color: '#9ca3af' },
  cardTitle: { fontSize: '15px', fontWeight: '700', color: '#f9fafb', margin: '4px 0 0' },
  cardDesc: { fontSize: '13px', color: '#6b7280', lineHeight: '1.4', margin: 0 },
  cardMeta: { display: 'flex', gap: '12px', color: '#9ca3af', fontSize: '12px', marginTop: '4px', justifyContent: 'flex-end', direction: 'rtl' },
  cardMetaItem: { display: 'flex', alignItems: 'center' },
  cardStaff: { fontSize: '13px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '4px', direction: 'rtl' }
};

export default Maintenance;
