import React, { useState, useEffect, useCallback, useRef } from 'react';
import API from '../services/api';
import Topbar from '../components/Topbar';
import { Search, Plus, Calendar, Edit, Eye, EyeOff, X, UserPlus, UserMinus, Camera, LayoutGrid, List, Phone } from 'lucide-react';

const INITIAL_FORM = { full_name: '', email: '', phone: '', national_id: '', nationality: '', password: '', villa_id: '', start_date: '', end_date: '', monthly_rent: '', payment_due_day: '1' };

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [showPwd, setShowPwd] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const avatarRef = useRef(null);
  const [viewMode, setViewMode] = useState('table');

  // Dependents
  const [depTenant, setDepTenant] = useState(null);
  const [dependents, setDependents] = useState([]);
  const [showDepModal, setShowDepModal] = useState(false);
  const [depLoading, setDepLoading] = useState(false);
  const [newDep, setNewDep] = useState({ full_name: '', relation: '', date_of_birth: '', school_name: '', school_grade: '' });

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/tenants', {
        params: { search, status: statusFilter, page, limit: 15 }
      });
      if (res.data.success) {
        setTenants(res.data.data);
        setPages(res.data.pagination.pages);
        setTotal(res.data.pagination.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  const fetchVillas = useCallback(async () => {
    try {
      const res = await API.get('/api/villas', { params: { status: 'vacant', limit: 200 } });
      if (res.data.success) setVillas(res.data.data);
    } catch (err) { /* ignore */ }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);
  useEffect(() => { if (showAddModal) fetchVillas(); }, [showAddModal, fetchVillas]);

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const resetForm = () => { setForm({ ...INITIAL_FORM }); setShowPwd(false); setAvatarFile(null); setAvatarPreview(null); if (avatarRef.current) avatarRef.current.value = ''; };

  const handleAvatarSelect = (e) => {
    const f = e.target.files[0];
    if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }
  };

  // Add
  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (avatarFile) fd.append('image', avatarFile);
      const res = await API.post('/api/tenants', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) { setShowAddModal(false); resetForm(); fetchTenants(); }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إضافة المستأجر.');
    }
  };

  // Edit
  const handleEdit = async (id) => {
    try {
      const res = await API.get(`/api/tenants/${id}`);
      if (res.data.success) {
        const t = res.data.data;
        const leaseRes = await API.get(`/api/tenants/${id}/lease`).catch(() => null);
        const lease = leaseRes?.data?.data;
        setForm({
          full_name: t.full_name || '',
          email: t.email || '',
          phone: t.phone || '',
          national_id: t.national_id || '',
          nationality: t.nationality || '',
          password: '',
          villa_id: lease?.villa_id || '',
          start_date: lease?.start_date ? lease.start_date.split('T')[0] : '',
          end_date: lease?.end_date ? lease.end_date.split('T')[0] : '',
          monthly_rent: lease?.monthly_rent || '',
          payment_due_day: lease?.payment_due_day || '1'
        });
        setEditId(id);
        setShowEditModal(true);
        fetchVillas();
      }
    } catch (err) {
      alert('تعذر تحميل بيانات المستأجر.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('full_name', form.full_name);
      fd.append('email', form.email || '');
      fd.append('phone', form.phone);
      fd.append('national_id', form.national_id || '');
      fd.append('nationality', form.nationality || '');
      if (avatarFile) fd.append('image', avatarFile);
      await API.put(`/api/tenants/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowEditModal(false); setEditId(null); resetForm(); fetchTenants();
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تعديل المستأجر.');
    }
  };

  // Toggle status
  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`هل أنت متأكد من ${newStatus === 'active' ? 'تفعيل' : 'تعطيل'} هذا المستأجر؟`)) return;
    try {
      await API.put(`/api/tenants/${id}`, { status: newStatus });
      fetchTenants();
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تغيير الحالة.');
    }
  };

  // Dependents
  const openDependents = async (tenant) => {
    setDepTenant(tenant);
    setShowDepModal(true);
    setDepLoading(true);
    try {
      const res = await API.get(`/api/tenants/${tenant.id}/dependents`);
      if (res.data.success) setDependents(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDepLoading(false);
    }
  };

  const [depAvatarFile, setDepAvatarFile] = useState(null);
  const depAvatarRef = useRef(null);

  const handleAddDep = async (e) => {
    e.preventDefault();
    if (!newDep.full_name || !newDep.relation) { alert('الاسم وصلة القرابة مطلوبان'); return; }
    try {
      const fd = new FormData();
      Object.entries(newDep).forEach(([k, v]) => fd.append(k, v));
      if (depAvatarFile) fd.append('image', depAvatarFile);
      const res = await API.post(`/api/tenants/${depTenant.id}/dependents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        setDependents([...dependents, res.data.data]);
        setNewDep({ full_name: '', relation: '', date_of_birth: '', school_name: '', school_grade: '' });
        setDepAvatarFile(null);
        if (depAvatarRef.current) depAvatarRef.current.value = '';
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إضافة التابع.');
    }
  };

  const handleRemoveDep = async (depId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التابع؟')) return;
    try {
      await API.delete(`/api/tenants/${depTenant.id}/dependents/${depId}`);
      setDependents(dependents.filter(d => d.id !== depId));
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر حذف التابع.');
    }
  };

  return (
    <div style={styles.container}>
      <Topbar title="دليل المستأجرين" />
      <div style={styles.content}>
        <div style={styles.actionsBar}>
          <button onClick={() => { resetForm(); setShowAddModal(true); }} style={styles.addBtn}>
            <Plus size={18} style={{ marginLeft: '8px' }} />
            <span>إضافة مستأجر</span>
          </button>
          <div style={styles.filters}>
            <div style={styles.inputWrapper}>
              <Search size={16} style={styles.inputIcon} />
              <input type="text" placeholder="البحث..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={styles.searchInput} />
            </div>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={styles.select}>
              <option value="">الحالة (الكل)</option>
              <option value="active">نشط</option>
              <option value="inactive">معطل</option>
            </select>
          </div>
          <div style={styles.viewToggle}>
            <button onClick={() => setViewMode('table')} style={{ ...styles.toggleBtn, ...(viewMode === 'table' ? styles.toggleActive : {}) }}><List size={16} /></button>
            <button onClick={() => setViewMode('card')} style={{ ...styles.toggleBtn, ...(viewMode === 'card' ? styles.toggleActive : {}) }}><LayoutGrid size={16} /></button>
          </div>
        </div>

        {loading ? (
          <div style={styles.center}>جاري التحميل...</div>
        ) : viewMode === 'card' ? (
          <div style={styles.cardGrid}>
            {tenants.map((t) => (
              <div key={t.id} className="glass-panel" style={styles.tenantCard}>
                <div style={styles.tenantCardAvatar}>
                  {t.avatar_url
                    ? <img src={t.avatar_url} alt={t.full_name} style={styles.cardAvatarImg} />
                    : <div style={styles.cardAvatarPlaceholder}>{t.full_name?.substring(0, 2) || 'ت'}</div>
                  }
                  <span style={{ ...styles.statusDot, backgroundColor: t.status === 'active' ? '#10b981' : '#ef4444' }} />
                </div>
                <div style={styles.tenantCardBody}>
                  <div style={styles.tcName}>{t.full_name}</div>
                  {t.villa && <div style={styles.tcVilla}>🏠 {t.villa}</div>}
                  {t.phone && <div style={styles.tcPhone}><Phone size={12} /> {t.phone}</div>}
                  {t.lease_end && <div style={styles.tcLease}><Calendar size={12} style={{marginLeft:'4px'}}/>{new Date(t.lease_end).toLocaleDateString('ar-SA')}</div>}
                  <div style={styles.cardActions}>
                    <button onClick={() => handleEdit(t.id)} style={styles.editBtn}><Edit size={15} /></button>
                    <button onClick={() => openDependents(t)} style={styles.depBtn}><UserPlus size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="glass-panel" style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>المستأجر</th>
                    <th style={styles.th}>الفيلا</th>
                    <th style={styles.th}>الجوال</th>
                    <th style={styles.th}>الهوية</th>
                    <th style={styles.th}>الجنسية</th>
                    <th style={styles.th}>انتهاء العقد</th>
                    <th style={styles.th}>الحالة</th>
                    <th style={styles.th}>التابعين</th>
                    <th style={styles.th}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} style={styles.trRow}>
                      <td style={styles.td}>
                        <div style={styles.tenantInfo}>
                          {t.avatar_url ? <img src={t.avatar_url} alt="" style={styles.avatarImg} /> : <div style={styles.avatar}>{t.full_name ? t.full_name.substring(0, 2) : 'ت'}</div>}
                          <div style={styles.nameContainer}>
                            <strong>{t.full_name}</strong>
                            <span style={styles.email}>{t.email || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>{t.villa || '—'}</td>
                      <td style={styles.td}>{t.phone}</td>
                      <td style={styles.td}>{t.national_id || '—'}</td>
                      <td style={styles.td}>{t.nationality || '—'}</td>
                      <td style={styles.td}>
                        {t.lease_end ? (
                          <div style={styles.leaseEnd}>
                            <Calendar size={14} style={{ marginLeft: '6px', color: '#6b7280' }} />
                            <span>{new Date(t.lease_end).toLocaleDateString('ar-SA')}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, backgroundColor: t.status === 'active' ? '#10b98120' : '#ef444420', color: t.status === 'active' ? '#10b981' : '#ef4444' }}>
                          {t.status === 'active' ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button onClick={() => openDependents(t)} style={styles.depBtn} title="عرض التابعين">
                          <UserPlus size={16} />
                        </button>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionBtns}>
                          <button onClick={() => handleEdit(t.id)} style={styles.editBtn} title="تعديل">
                            <Edit size={15} />
                          </button>
                          <button onClick={() => handleToggleStatus(t.id, t.status)} style={t.status === 'active' ? styles.warnBtn : styles.successBtn} title={t.status === 'active' ? 'تعطيل' : 'تفعيل'}>
                            {t.status === 'active' ? <X size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={styles.pagination}>
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={styles.pageBtn}>السابق</button>
                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} style={{ ...styles.pageBtn, ...(page === p ? styles.pageActive : {}) }}>{p}</button>
                ))}
                <button disabled={page >= pages} onClick={() => setPage(page + 1)} style={styles.pageBtn}>التالي</button>
                <span style={styles.pageInfo}>إجمالي {total}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Tenant Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>إضافة مستأجر جديد</h3>
            <form onSubmit={handleAdd} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الاسم الكامل *</label>
                  <input name="full_name" required value={form.full_name} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>البريد الإلكتروني</label>
                  <input name="email" type="email" value={form.email} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الجوال *</label>
                  <input name="phone" required value={form.phone} onChange={handleFormChange} style={styles.input} />
                </div>
                  <div style={styles.formGroup}>
                  <label style={styles.label}>الصورة الشخصية</label>
                  <div style={styles.avatarUpload}>
                    {avatarPreview ? <img src={avatarPreview} alt="" style={styles.avatarPreviewImg} /> : <Camera size={24} style={{ color: '#6b7280' }} />}
                    <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }} />
                    <button type="button" onClick={() => avatarRef.current?.click()} style={styles.uploadAvatarBtn}>{avatarPreview ? 'تغيير' : 'إضافة صورة'}</button>
                  </div>
                </div>
                </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>كلمة المرور *</label>
                  <div style={styles.pwdWrapper}>
                    <input name="password" type={showPwd ? 'text' : 'password'} required value={form.password} onChange={handleFormChange} style={styles.input} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} style={styles.pwdToggle}>{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>رقم الهوية / الإقامة</label>
                  <input name="national_id" value={form.national_id} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الجنسية</label>
                  <input name="nationality" value={form.nationality} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الفيلا *</label>
                <select name="villa_id" required value={form.villa_id} onChange={handleFormChange} style={styles.input}>
                  <option value="">اختر فيلا شاغرة...</option>
                  {villas.map(v => <option key={v.id} value={v.id}>{v.unit_number} ({v.block})</option>)}
                </select>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>تاريخ بداية العقد *</label>
                  <input name="start_date" type="date" required value={form.start_date} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>تاريخ انتهاء العقد *</label>
                  <input name="end_date" type="date" required value={form.end_date} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الإيجار الشهري *</label>
                  <input name="monthly_rent" type="number" required value={form.monthly_rent} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>اليوم المستحق للدفع</label>
                  <input name="payment_due_day" type="number" min="1" max="31" value={form.payment_due_day} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>إضافة المستأجر</button>
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} style={styles.cancelBtn}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {showEditModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>تعديل بيانات المستأجر</h3>
            <form onSubmit={handleUpdate} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الاسم الكامل</label>
                  <input name="full_name" required value={form.full_name} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>البريد الإلكتروني</label>
                  <input name="email" type="email" value={form.email} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الجوال</label>
                  <input name="phone" value={form.phone} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>رقم الهوية / الإقامة</label>
                  <input name="national_id" value={form.national_id} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الجنسية</label>
                <input name="nationality" value={form.nationality} onChange={handleFormChange} style={styles.input} />
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>حفظ التعديلات</button>
                <button type="button" onClick={() => { setShowEditModal(false); setEditId(null); resetForm(); }} style={styles.cancelBtn}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dependents Modal */}
      {showDepModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.depModalContent}>
            <div style={styles.depHeader}>
              <h3 style={styles.modalTitle}>تابعي: {depTenant?.full_name}</h3>
              <button onClick={() => setShowDepModal(false)} style={styles.closeBtn}><X size={20} /></button>
            </div>

            {depLoading ? (
              <div style={styles.center}>جاري تحميل التابعين...</div>
            ) : (
              <>
                {dependents.length === 0 ? (
                  <div style={styles.center}>لا يوجد تابعين مسجلين</div>
                ) : (
                  <div style={styles.depList}>
                    {dependents.map(d => (
                      <div key={d.id} style={styles.depItem}>
                        <div style={styles.depInfo}>
                          {d.avatar_url && <img src={d.avatar_url} alt="" style={styles.depAvatar} />}
                          <strong>{d.full_name}</strong>
                          <span style={styles.depRelation}>{d.relation}{d.date_of_birth ? ` - ${new Date(d.date_of_birth).toLocaleDateString('ar-SA')}` : ''}</span>
                          {d.school_name && <span style={styles.depSchool}>{d.school_name} ({d.school_grade || '—'})</span>}
                        </div>
                        <button onClick={() => handleRemoveDep(d.id)} style={styles.removeDepBtn} title="حذف التابع">
                          <UserMinus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={handleAddDep} style={styles.depForm}>
                  <h4 style={styles.depFormTitle}>إضافة تابع جديد</h4>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>الصورة</label>
                    <div style={styles.avatarUpload}>
                      {depAvatarFile && <img src={URL.createObjectURL(depAvatarFile)} alt="" style={styles.avatarPreviewImg} />}
                      <input ref={depAvatarRef} type="file" accept="image/*" onChange={(e) => setDepAvatarFile(e.target.files[0])} style={{ display: 'none' }} />
                      <button type="button" onClick={() => depAvatarRef.current?.click()} style={styles.uploadAvatarBtn}>إضافة صورة</button>
                    </div>
                  </div>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>الاسم الكامل *</label>
                      <input value={newDep.full_name} onChange={(e) => setNewDep({ ...newDep, full_name: e.target.value })} style={styles.input} />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>صلة القرابة *</label>
                      <select value={newDep.relation} onChange={(e) => setNewDep({ ...newDep, relation: e.target.value })} style={styles.input}>
                        <option value="">اختر...</option>
                        <option value="ابن">ابن</option>
                        <option value="ابنة">ابنة</option>
                        <option value="زوجة">زوجة</option>
                        <option value="والد">والد</option>
                        <option value="والدة">والدة</option>
                        <option value="أخ">أخ</option>
                        <option value="أخت">أخت</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                  </div>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>تاريخ الميلاد</label>
                      <input type="date" value={newDep.date_of_birth} onChange={(e) => setNewDep({ ...newDep, date_of_birth: e.target.value })} style={styles.input} />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>المدرسة</label>
                      <input value={newDep.school_name} onChange={(e) => setNewDep({ ...newDep, school_name: e.target.value })} style={styles.input} />
                    </div>
                  </div>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>الصف الدراسي</label>
                      <input value={newDep.school_grade} onChange={(e) => setNewDep({ ...newDep, school_grade: e.target.value })} style={styles.input} />
                    </div>
                    <div style={styles.formGroup}>
                      <button type="submit" style={styles.addDepBtn}>إضافة التابع</button>
                    </div>
                  </div>
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
  actionsBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' },
  addBtn: { height: '42px', padding: '0 20px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  filters: { display: 'flex', gap: '12px', alignItems: 'center' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', right: '12px', color: '#6b7280' },
  searchInput: { width: '220px', height: '40px', backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0 32px 0 16px', color: '#f9fafb', fontSize: '13px', outline: 'none', textAlign: 'right' },
  select: { height: '40px', padding: '0 12px', backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f9fafb', fontSize: '13px', outline: 'none', cursor: 'pointer' },
  tableCard: { overflowX: 'auto', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', direction: 'rtl', textAlign: 'right' },
  thRow: { borderBottom: '1px solid rgba(255,255,255,0.05)' },
  th: { padding: '16px', color: '#9ca3af', fontWeight: '500', fontSize: '13px' },
  trRow: { borderBottom: '1px solid rgba(255,255,255,0.03)' },
  td: { padding: '12px', color: '#e5e7eb', fontSize: '14px' },
  tenantInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '12px', flexShrink: 0 },
  avatarImg: { width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  avatarUpload: { display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#111827', borderRadius: '8px', padding: '8px 12px', border: '1px solid rgba(255,255,255,0.08)' },
  avatarPreviewImg: { width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' },
  uploadAvatarBtn: { padding: '6px 12px', backgroundColor: 'rgba(59,130,246,0.15)', border: 'none', borderRadius: '6px', color: '#3b82f6', fontSize: '12px', cursor: 'pointer' },
  nameContainer: { display: 'flex', flexDirection: 'column', gap: '2px' },
  email: { fontSize: '11px', color: '#9ca3af' },
  leaseEnd: { display: 'flex', alignItems: 'center' },
  badge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' },
  depBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  actionBtns: { display: 'flex', gap: '6px' },
  editBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  warnBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  successBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' },
  pageBtn: { height: '36px', padding: '0 14px', backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#9ca3af', fontSize: '13px', cursor: 'pointer' },
  pageActive: { backgroundColor: 'rgba(59,130,246,0.2)', color: '#3b82f6', borderColor: '#3b82f640' },
  pageInfo: { fontSize: '12px', color: '#6b7280', marginRight: '8px' },
  modalOverlay: { position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalContent: { width: '100%', maxWidth: '560px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' },
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
  // Dependents modal
  depModalContent: { width: '100%', maxWidth: '560px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '80vh', overflowY: 'auto' },
  depHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' },
  depList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  depItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#111827', borderRadius: '8px', gap: '12px' },
  depAvatar: { width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' },
  depInfo: { display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' },
  depRelation: { fontSize: '12px', color: '#9ca3af' },
  depSchool: { fontSize: '11px', color: '#6b7280' },
  removeDepBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  depForm: { display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' },
  depFormTitle: { fontSize: '14px', fontWeight: '600', color: '#d1d5db', textAlign: 'right', margin: 0 },
  addDepBtn: { height: '42px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer', marginTop: '22px' },
  viewToggle: { display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' },
  toggleBtn: { width: '34px', height: '34px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: '#3b82f6', color: '#fff' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' },
  tenantCard: { borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' },
  tenantCardAvatar: { position: 'relative', width: '72px', height: '72px' },
  cardAvatarImg: { width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(16,185,129,0.3)' },
  cardAvatarPlaceholder: { width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '20px' },
  statusDot: { position: 'absolute', bottom: '3px', right: '3px', width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #0b0f19' },
  tenantCardBody: { display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', alignItems: 'center' },
  tcName: { fontSize: '15px', fontWeight: '700', color: '#f9fafb' },
  tcVilla: { fontSize: '12px', color: '#6b7280' },
  tcPhone: { fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' },
  tcLease: { fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center' },
  cardActions: { display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'center' }
};

export default Tenants;