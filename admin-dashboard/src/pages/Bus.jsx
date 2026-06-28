import React, { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import Topbar from '../components/Topbar';
import { Bus as BusIcon, Plus, Edit, Trash2, Eye, X, UserPlus, List, LayoutGrid, Users, ShieldAlert } from 'lucide-react';

const INITIAL_FORM = { route_name: '', driver_name: '', driver_phone: '', vehicle_plate: '', max_capacity: 20, school_name: '', departure_time: '', return_time: '' };

const Bus = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'


  // Enrollments
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollRoute, setEnrollRoute] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [dependents, setDependents] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [selectedDep, setSelectedDep] = useState('');
  const [seatNumber, setSeatNumber] = useState('');

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/bus');
      if (res.data.success) setRoutes(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const resetForm = () => setForm({ ...INITIAL_FORM });

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/api/bus/routes', form);
      if (res.data.success) { setShowAddModal(false); resetForm(); fetchRoutes(); }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إضافة المسار.');
    }
  };

  const handleEdit = async (route) => {
    setForm({
      route_name: route.route_name || '',
      driver_name: route.driver_name || '',
      driver_phone: route.driver_phone || '',
      vehicle_plate: route.vehicle_plate || '',
      max_capacity: route.max_capacity || 20,
      school_name: route.school_name || '',
      departure_time: route.departure_time || '',
      return_time: route.return_time || ''
    });
    setEditId(route.id);
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put(`/api/bus/routes/${editId}`, form);
      if (res.data.success) { setShowEditModal(false); setEditId(null); resetForm(); fetchRoutes(); }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تعديل المسار.');
    }
  };

  // Enrollments
  const openEnrollments = async (route) => {
    setEnrollRoute(route);
    setShowEnrollModal(true);
    setEnrollLoading(true);
    setSelectedTenant('');
    setSelectedDep('');
    setSeatNumber('');
    try {
      const [enrollRes, tenantRes] = await Promise.all([
        API.get('/api/bus/enrollments', { params: { route_id: route.id } }),
        API.get('/api/tenants', { params: { status: 'active', limit: 500 } })
      ]);
      if (enrollRes.data.success) setEnrollments(enrollRes.data.data);
      if (tenantRes.data.success) setTenants(tenantRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleTenantChange = async (tenantId) => {
    setSelectedTenant(tenantId);
    setSelectedDep('');
    if (!tenantId) { setDependents([]); return; }
    try {
      const res = await API.get(`/api/tenants/${tenantId}/dependents`);
      if (res.data.success) setDependents(res.data.data);
    } catch (err) {
      setDependents([]);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!selectedTenant || !selectedDep) { alert('يرجى اختيار المستأجر والتابع'); return; }
    try {
      const res = await API.post('/api/bus/enroll', {
        route_id: enrollRoute.id,
        dependent_id: parseInt(selectedDep),
        tenant_id: parseInt(selectedTenant),
        seat_number: seatNumber || null
      });
      if (res.data.success) {
        setSelectedTenant('');
        setSelectedDep('');
        setSeatNumber('');
        // Refresh enrollments
        const enrollRes = await API.get('/api/bus/enrollments', { params: { route_id: enrollRoute.id } });
        if (enrollRes.data.success) setEnrollments(enrollRes.data.data);
        fetchRoutes();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تسجيل التابع.');
    }
  };

  const handleRemoveEnrollment = async (enrollId) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا التسجيل؟')) return;
    try {
      await API.delete(`/api/bus/enrollments/${enrollId}`);
      setEnrollments(enrollments.filter(e => e.id !== enrollId));
      fetchRoutes();
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إلغاء التسجيل.');
    }
  };

  return (
    <div style={styles.container}>
      <Topbar title="حافلات المدارس" />
      <div style={styles.content}>
        <div style={styles.actionsBar}>
          <button onClick={() => { resetForm(); setShowAddModal(true); }} style={styles.addBtn}>
            <Plus size={18} style={{ marginLeft: '8px' }} />
            <span>إضافة مسار</span>
          </button>
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
          <div style={styles.center}>جاري التحميل...</div>
        ) : routes.length === 0 ? (
          <div style={styles.center}>لا توجد مسارات مسجلة</div>
        ) : viewMode === 'card' ? (
          <div style={styles.cardGrid}>
            {routes.map((route) => (
              <div key={route.id} className="glass-panel" style={styles.routeCard}>
                <div style={styles.routeCardHeader}>
                  <div style={styles.iconContainer}><BusIcon size={20} style={{ color: '#f59e0b' }} /></div>
                  <h4 style={styles.routeCardTitle}>{route.route_name}</h4>
                </div>
                <div style={styles.routeCardBody}>
                  <div style={styles.routeMeta}>🏫 المدرسة: {route.school_name || '—'}</div>
                  <div style={styles.routeMeta}>👤 السائق: {route.driver_name || '—'} ({route.driver_phone || '—'})</div>
                  <div style={styles.routeMeta}>🚗 المركبة: {route.vehicle_plate || '—'}</div>
                  <div style={styles.routeCapacity}>
                    <div style={styles.capacityLabel}>المقاعد المحجوزة:</div>
                    <span style={{ ...styles.badge, backgroundColor: route.enrolled_count >= route.max_capacity ? '#ef444420' : '#10b98120', color: route.enrolled_count >= route.max_capacity ? '#ef4444' : '#10b981' }}>
                      {route.enrolled_count} / {route.max_capacity}
                    </span>
                  </div>
                </div>
                <div style={styles.routeCardActions}>
                  <button onClick={() => openEnrollments(route)} style={styles.enrollBtn} title="عرض التسجيلات">
                    <Eye size={15} style={{ marginLeft: '4px' }} /> عرض
                  </button>
                  <button onClick={() => handleEdit(route)} style={styles.editBtn} title="تعديل">
                    <Edit size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel" style={styles.tableCard}>

            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>اسم المسار</th>
                  <th style={styles.th}>السائق</th>
                  <th style={styles.th}>الجوال</th>
                  <th style={styles.th}>لوحة المركبة</th>
                  <th style={styles.th}>المدرسة</th>
                  <th style={styles.th}>المقاعد</th>
                  <th style={styles.th}>التسجيلات</th>
                  <th style={styles.th}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => (
                  <tr key={route.id} style={styles.trRow}>
                    <td style={styles.td}>
                      <div style={styles.routeCell}>
                        <div style={styles.iconContainer}><BusIcon size={18} style={{ color: '#f59e0b' }} /></div>
                        <strong>{route.route_name}</strong>
                      </div>
                    </td>
                    <td style={styles.td}>{route.driver_name || '—'}</td>
                    <td style={styles.td}>{route.driver_phone || '—'}</td>
                    <td style={styles.td}>{route.vehicle_plate || '—'}</td>
                    <td style={styles.td}>{route.school_name || '—'}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, backgroundColor: route.enrolled_count >= route.max_capacity ? '#ef444420' : '#10b98120', color: route.enrolled_count >= route.max_capacity ? '#ef4444' : '#10b981' }}>
                        {route.enrolled_count} / {route.max_capacity}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => openEnrollments(route)} style={styles.enrollBtn} title="عرض التسجيلات">
                        <Eye size={16} />
                      </button>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionBtns}>
                        <button onClick={() => handleEdit(route)} style={styles.editBtn} title="تعديل">
                          <Edit size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Route Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>إضافة مسار جديد</h3>
            <form onSubmit={handleAdd} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>اسم المسار *</label>
                <input name="route_name" required value={form.route_name} onChange={handleFormChange} style={styles.input} />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>اسم السائق</label>
                  <input name="driver_name" value={form.driver_name} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>جوال السائق</label>
                  <input name="driver_phone" value={form.driver_phone} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>لوحة المركبة</label>
                  <input name="vehicle_plate" value={form.vehicle_plate} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>المدرسة</label>
                  <input name="school_name" value={form.school_name} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الطاقة الاستيعابية *</label>
                  <input name="max_capacity" type="number" required value={form.max_capacity} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>وقت الانطلاق</label>
                  <input name="departure_time" type="time" value={form.departure_time} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>وقت العودة</label>
                <input name="return_time" type="time" value={form.return_time} onChange={handleFormChange} style={styles.input} />
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>إضافة المسار</button>
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} style={styles.cancelBtn}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Route Modal */}
      {showEditModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>تعديل المسار</h3>
            <form onSubmit={handleUpdate} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>اسم المسار</label>
                <input name="route_name" required value={form.route_name} onChange={handleFormChange} style={styles.input} />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>اسم السائق</label>
                  <input name="driver_name" value={form.driver_name} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>جوال السائق</label>
                  <input name="driver_phone" value={form.driver_phone} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>لوحة المركبة</label>
                  <input name="vehicle_plate" value={form.vehicle_plate} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>المدرسة</label>
                  <input name="school_name" value={form.school_name} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الطاقة الاستيعابية</label>
                  <input name="max_capacity" type="number" value={form.max_capacity} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>وقت الانطلاق</label>
                  <input name="departure_time" type="time" value={form.departure_time} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>وقت العودة</label>
                <input name="return_time" type="time" value={form.return_time} onChange={handleFormChange} style={styles.input} />
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>حفظ التعديلات</button>
                <button type="button" onClick={() => { setShowEditModal(false); setEditId(null); resetForm(); }} style={styles.cancelBtn}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrollments Modal */}
      {showEnrollModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.enrollModalContent}>
            <div style={styles.enrollHeader}>
              <h3 style={styles.modalTitle}>تسجيلات: {enrollRoute?.route_name}</h3>
              <button onClick={() => setShowEnrollModal(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>

            {enrollLoading ? (
              <div style={styles.center}>جاري تحميل التسجيلات...</div>
            ) : (
              <>
                <div style={styles.enrollList}>
                  {enrollments.length === 0 ? (
                    <div style={styles.center}>لا يوجد تسجيلات</div>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.thRow}>
                          <th style={styles.th}>الطفل</th>
                          <th style={styles.th}>الصف</th>
                          <th style={styles.th}>ولي الأمر</th>
                          <th style={styles.th}>رقم المقعد</th>
                          <th style={styles.th}>إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map(en => (
                          <tr key={en.id} style={styles.trRow}>
                            <td style={styles.td}>{en.child_name}</td>
                            <td style={styles.td}>{en.school_grade || '—'}</td>
                            <td style={styles.td}>{en.parent_name} ({en.parent_phone})</td>
                            <td style={styles.td}>{en.seat_number || '—'}</td>
                            <td style={styles.td}>
                              <button onClick={() => handleRemoveEnrollment(en.id)} style={styles.removeBtn} title="إلغاء التسجيل">
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <form onSubmit={handleEnroll} style={styles.enrollForm}>
                  <h4 style={styles.depFormTitle}>تسجيل تابع جديد</h4>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>المستأجر *</label>
                      <select value={selectedTenant} onChange={(e) => handleTenantChange(e.target.value)} style={styles.input}>
                        <option value="">اختر مستأجر...</option>
                        {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name} - {t.villa}</option>)}
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>التابع *</label>
                      <select value={selectedDep} onChange={(e) => setSelectedDep(e.target.value)} style={styles.input} disabled={dependents.length === 0}>
                        <option value="">اختر تابع...</option>
                        {dependents.map(d => <option key={d.id} value={d.id}>{d.full_name} ({d.relation})</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>رقم المقعد (اختياري)</label>
                    <input type="text" value={seatNumber} onChange={(e) => setSeatNumber(e.target.value)} style={styles.input} />
                  </div>
                  <button type="submit" style={styles.addEnrollBtn}>
                    <UserPlus size={16} style={{ marginLeft: '8px' }} />
                    تسجيل
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { marginRight: '260px', minHeight: '100vh', backgroundColor: '#0b0f19', fontFamily: 'Zain, sans-serif' },
  content: { padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' },
  center: { padding: '40px', textAlign: 'center', color: '#9ca3af' },
  actionsBar: { display: 'flex', justifyContent: 'flex-start', alignItems: 'center' },
  addBtn: { height: '42px', padding: '0 20px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  tableCard: { overflowX: 'auto', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', direction: 'rtl', textAlign: 'right' },
  thRow: { borderBottom: '1px solid rgba(255,255,255,0.05)' },
  th: { padding: '16px', color: '#9ca3af', fontWeight: '500', fontSize: '13px' },
  trRow: { borderBottom: '1px solid rgba(255,255,255,0.03)' },
  td: { padding: '14px 16px', color: '#e5e7eb', fontSize: '14px' },
  routeCell: { display: 'flex', alignItems: 'center', gap: '10px' },
  iconContainer: { width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  badge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' },
  enrollBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionBtns: { display: 'flex', gap: '6px' },
  editBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalContent: { width: '100%', maxWidth: '520px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' },
  modalTitle: { fontSize: '18px', fontWeight: '600', color: '#f9fafb', textAlign: 'right' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' },
  label: { fontSize: '12px', color: '#9ca3af' },
  input: { height: '42px', padding: '0 12px', backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f9fafb', fontSize: '13px', outline: 'none', textAlign: 'right' },
  modalActions: { display: 'flex', gap: '12px', marginTop: '8px' },
  saveBtn: { flex: 1, height: '44px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer' },
  cancelBtn: { flex: 1, height: '44px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#9ca3af', fontWeight: '600', cursor: 'pointer' },
  closeBtn: { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' },
  // Enrollments modal
  enrollModalContent: { width: '100%', maxWidth: '680px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '80vh', overflowY: 'auto' },
  enrollHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  enrollList: { maxHeight: '300px', overflowY: 'auto' },
  removeBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  enrollForm: { display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' },
  depFormTitle: { fontSize: '14px', fontWeight: '600', color: '#d1d5db', textAlign: 'right', margin: 0 },
  addEnrollBtn: { height: '42px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  viewToggle: { display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px', marginLeft: 'auto' },
  toggleBtn: { width: '34px', height: '34px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  toggleActive: { backgroundColor: '#3b82f6', color: '#fff' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  routeCard: { borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid rgba(255,255,255,0.07)' },
  routeCardHeader: { display: 'flex', alignItems: 'center', gap: '12px', direction: 'rtl' },
  routeCardTitle: { fontSize: '16px', fontWeight: '700', color: '#f9fafb', margin: 0 },
  routeCardBody: { display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' },
  routeMeta: { fontSize: '13px', color: '#9ca3af' },
  routeCapacity: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', direction: 'rtl' },
  capacityLabel: { fontSize: '13px', color: '#6b7280' },
  routeCardActions: { display: 'flex', gap: '10px', marginTop: '4px', justifyContent: 'flex-start', direction: 'rtl' }
};

export default Bus;