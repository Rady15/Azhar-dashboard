import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import Topbar from '../components/Topbar';
import { CheckSquare, Star, Plus, Trash2, Edit, Eye, EyeOff, Camera, LayoutGrid, List, Phone, Mail } from 'lucide-react';

const INITIAL_FORM = { full_name: '', phone: '', email: '', password: '' };

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [showPwd, setShowPwd] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarRef = useRef(null);
  const [viewMode, setViewMode] = useState('table');

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/staff');
      if (res.data.success) setStaff(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const resetForm = () => { setForm({ ...INITIAL_FORM }); setShowPwd(false); setAvatarFile(null); setAvatarPreview(null); if (avatarRef.current) avatarRef.current.value = ''; };
  const handleAvatarSelect = (e) => { const f = e.target.files[0]; if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); } };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (avatarFile) fd.append('image', avatarFile);
      const res = await API.post('/api/staff', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) { setShowAddModal(false); resetForm(); fetchStaff(); }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إضافة الفرد.');
    }
  };

  const handleEdit = async (id) => {
    try {
      const res = await API.get(`/api/staff/${id}`);
      if (res.data.success) {
        const s = res.data.data;
        setForm({ full_name: s.full_name || '', phone: s.phone || '', email: s.email || '', password: '' });
        setEditId(id);
        setShowEditModal(true);
      }
    } catch (err) {
      alert('تعذر تحميل البيانات.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('full_name', form.full_name);
      fd.append('phone', form.phone);
      fd.append('email', form.email || '');
      if (avatarFile) fd.append('image', avatarFile);
      await API.put(`/api/staff/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowEditModal(false); setEditId(null); resetForm(); fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تعديل الفرد.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الفرد؟')) return;
    try {
      await API.delete(`/api/staff/${id}`);
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر حذف الفرد.');
    }
  };

  return (
    <div style={styles.container}>
      <Topbar title="فريق صيانة الكمباوند" />
      <div style={styles.content}>
        <div style={styles.actionsBar}>
          <button onClick={() => { resetForm(); setShowAddModal(true); }} style={styles.addBtn}>
            <Plus size={18} style={{ marginLeft: '8px' }} />
            <span>إضافة فرد</span>
          </button>
          <div style={styles.viewToggle}>
            <button onClick={() => setViewMode('table')} style={{ ...styles.toggleBtn, ...(viewMode === 'table' ? styles.toggleActive : {}) }}><List size={16} /></button>
            <button onClick={() => setViewMode('card')} style={{ ...styles.toggleBtn, ...(viewMode === 'card' ? styles.toggleActive : {}) }}><LayoutGrid size={16} /></button>
          </div>
        </div>

        {loading ? (
          <div style={styles.center}>جاري التحميل...</div>
        ) : staff.length === 0 ? (
          <div style={styles.center}>لا يوجد فريق عمل مسجل</div>
        ) : viewMode === 'card' ? (
          <div style={styles.cardGrid}>
            {staff.map((m) => (
              <div key={m.id} className="glass-panel" style={styles.staffCard}>
                <div style={styles.cardAvatarWrap}>
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt={m.full_name} style={styles.cardAvatarImg} />
                    : <div style={styles.cardAvatarPlaceholder}>{m.full_name?.substring(0, 2) || 'فخ'}</div>
                  }
                  <span style={{ ...styles.statusDot, backgroundColor: m.status === 'active' ? '#10b981' : '#ef4444' }} />
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.cardName}>{m.full_name}</div>
                  <div style={styles.cardRole}>فريق الصيانة</div>
                  <div style={styles.cardStats}>
                    <div style={styles.statItem}><CheckSquare size={13} color="#f59e0b" /><span>{m.active_jobs || 0} معلقة</span></div>
                    <div style={styles.statItem}><Star size={13} color="#10b981" /><span>{m.total_completed || 0} مكتملة</span></div>
                  </div>
                  {m.phone && <div style={styles.cardContact}><Phone size={12} /> <span>{m.phone}</span></div>}
                  <div style={styles.cardActions}>
                    <button onClick={() => handleEdit(m.id)} style={styles.editBtn}><Edit size={15} /></button>
                    <button onClick={() => handleDelete(m.id)} style={styles.deleteBtn}><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel" style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>الفرد</th>
                  <th style={styles.th}>الجوال</th>
                  <th style={styles.th}>الحالة</th>
                  <th style={styles.th}>مهام معلقة</th>
                  <th style={styles.th}>مهام مكتملة</th>
                  <th style={styles.th}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((m) => (
                  <tr key={m.id} style={styles.trRow}>
                    <td style={styles.td}>
                      <div style={styles.memberInfo}>
                        {m.avatar_url ? <img src={m.avatar_url} alt="" style={styles.avatarImg} /> : <div style={styles.avatar}>{m.full_name ? m.full_name.substring(0, 2) : 'ف'}</div>}
                        <div>
                          <strong>{m.full_name}</strong>
                          {m.email && <span style={styles.email}>{m.email}</span>}
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>{m.phone}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, backgroundColor: m.status === 'active' ? '#10b98120' : '#ef444420', color: m.status === 'active' ? '#10b981' : '#ef4444' }}>
                        {m.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.statChip}>
                        <CheckSquare size={14} style={{ marginLeft: '6px', color: '#f59e0b' }} />
                        <span>{m.active_jobs || 0}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.statChip}>
                        <Star size={14} style={{ marginLeft: '6px', color: '#10b981' }} />
                        <span>{m.total_completed || 0}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionBtns}>
                        <button onClick={() => handleEdit(m.id)} style={styles.editBtn} title="تعديل">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => handleDelete(m.id)} style={styles.deleteBtn} title="حذف">
                          <Trash2 size={15} />
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

      {/* Add Staff Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>إضافة فرد جديد</h3>
            <form onSubmit={handleAdd} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>الاسم الكامل *</label>
                <input name="full_name" required value={form.full_name} onChange={handleFormChange} style={styles.input} />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الجوال *</label>
                  <input name="phone" required value={form.phone} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>البريد الإلكتروني</label>
                  <input name="email" type="email" value={form.email} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الصورة الشخصية</label>
                <div style={styles.avatarUpload}>
                  {avatarPreview ? <img src={avatarPreview} alt="" style={styles.avatarPreviewImg} /> : <Camera size={24} style={{ color: '#6b7280' }} />}
                  <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
                  <button type="button" onClick={() => avatarRef.current?.click()} style={styles.uploadAvatarBtn}>{avatarPreview ? 'تغيير' : 'إضافة صورة'}</button>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>كلمة المرور *</label>
                <div style={styles.pwdWrapper}>
                  <input name="password" type={showPwd ? 'text' : 'password'} required value={form.password} onChange={handleFormChange} style={styles.input} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} style={styles.pwdToggle}>{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>إضافة</button>
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} style={styles.cancelBtn}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>تعديل بيانات الفرد</h3>
            <form onSubmit={handleUpdate} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>الصورة الشخصية</label>
                <div style={styles.avatarUpload}>
                  {avatarPreview ? <img src={avatarPreview} alt="" style={styles.avatarPreviewImg} /> : <Camera size={24} style={{ color: '#6b7280' }} />}
                  <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
                  <button type="button" onClick={() => avatarRef.current?.click()} style={styles.uploadAvatarBtn}>{avatarPreview ? 'تغيير' : 'إضافة صورة'}</button>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الاسم الكامل</label>
                <input name="full_name" required value={form.full_name} onChange={handleFormChange} style={styles.input} />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الجوال</label>
                  <input name="phone" value={form.phone} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>البريد الإلكتروني</label>
                  <input name="email" type="email" value={form.email} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>حفظ التعديلات</button>
                <button type="button" onClick={() => { setShowEditModal(false); setEditId(null); resetForm(); }} style={styles.cancelBtn}>إلغاء</button>
              </div>
            </form>
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
  memberInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '13px' },
  email: { display: 'block', fontSize: '11px', color: '#9ca3af', marginTop: '2px' },
  badge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' },
  statChip: { display: 'flex', alignItems: 'center', fontSize: '13px' },
  actionBtns: { display: 'flex', gap: '6px' },
  editBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalContent: { width: '100%', maxWidth: '480px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' },
  modalTitle: { fontSize: '18px', fontWeight: '600', color: '#f9fafb', textAlign: 'right' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' },
  label: { fontSize: '12px', color: '#9ca3af' },
  input: { height: '42px', padding: '0 12px', backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f9fafb', fontSize: '13px', outline: 'none', textAlign: 'right' },
  pwdWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  pwdToggle: { position: 'absolute', right: '8px', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', display: 'flex' },
  modalActions: { display: 'flex', gap: '12px', marginTop: '8px' },
  saveBtn: { flex: 1, height: '44px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer' },
  cancelBtn: { flex: 1, height: '44px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#9ca3af', fontWeight: '600', cursor: 'pointer' },
  avatarPreviewImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' },
  uploadAvatarBtn: { marginTop: '8px', padding: '6px 14px', backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '6px', color: '#3b82f6', cursor: 'pointer', fontSize: '12px' },
  viewToggle: { display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' },
  toggleBtn: { width: '34px', height: '34px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: '#3b82f6', color: '#fff' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
  staffCard: { borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', position: 'relative' },
  cardAvatarWrap: { position: 'relative', width: '80px', height: '80px' },
  cardAvatarImg: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(59,130,246,0.3)' },
  cardAvatarPlaceholder: { width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '20px' },
  statusDot: { position: 'absolute', bottom: '4px', right: '4px', width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #0b0f19' },
  cardBody: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' },
  cardName: { fontSize: '15px', fontWeight: '700', color: '#f9fafb' },
  cardRole: { fontSize: '12px', color: '#6b7280', backgroundColor: 'rgba(59,130,246,0.08)', padding: '2px 10px', borderRadius: '20px' },
  cardStats: { display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '4px' },
  statItem: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#9ca3af' },
  cardContact: { fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' },
  cardActions: { display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'center' }
};

export default Staff;