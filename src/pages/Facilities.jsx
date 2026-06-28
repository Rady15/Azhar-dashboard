import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import Topbar from '../components/Topbar';
import { Plus, Trash2, Edit, Camera, X, Calendar, Users, Clock, Eye, LayoutGrid, List } from 'lucide-react';

const CATEGORIES = [
  { value: 'gym', label: 'نادي رياضي', icon: '🏋️' },
  { value: 'pool', label: 'حمام سباحة', icon: '🏊' },
  { value: 'event_hall', label: 'قاعة مناسبات', icon: '🎪' },
  { value: 'sports', label: 'ملعب رياضي', icon: '⚽' },
  { value: 'clubhouse', label: 'نادي اجتماعي', icon: '🏠' },
  { value: 'playground', label: 'ملعب أطفال', icon: '🛝' },
  { value: 'other', label: 'أخرى', icon: '📌' }
];

const INITIAL_FORM = { name: '', name_ar: '', description: '', category: 'other', max_capacity: 1, opening_time: '', closing_time: '', is_active: true };

const Facilities = () => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsFacility, setBookingsFacility] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const imageRef = useRef(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/facilities');
      if (res.data.success) setFacilities(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFacilities(); }, []);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const resetForm = () => {
    setForm({ ...INITIAL_FORM });
    setImageFiles([]);
    setImagePreviews([]);
    setRemoveImages([]);
    if (imageRef.current) imageRef.current.value = '';
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length) {
      setImageFiles(prev => [...prev, ...files]);
      const previews = files.map(f => URL.createObjectURL(f));
      setImagePreviews(prev => [...prev, ...previews]);
    }
  };

  const removeImage = (idx) => {
    URL.revokeObjectURL(imagePreviews[idx]);
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingImage = (idx) => {
    setRemoveImages(prev => [...prev, idx]);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      imageFiles.forEach(f => fd.append('images', f));
      const res = await API.post('/api/facilities', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) { setShowAddModal(false); resetForm(); fetchFacilities(); }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إضافة المرفق.');
    }
  };

  const handleEdit = async (id) => {
    try {
      const f = facilities.find(f => f.id === id);
      if (!f) return;
      setForm({
        name: f.name || '',
        name_ar: f.name_ar || '',
        description: f.description || '',
        category: f.category || 'other',
        max_capacity: f.max_capacity || 1,
        opening_time: f.opening_time || '',
        closing_time: f.closing_time || '',
        is_active: f.is_active !== false
      });
      setEditId(id);
      setImageFiles([]);
      setImagePreviews([]);
      setRemoveImages([]);
      setShowEditModal(true);
    } catch (err) {
      alert('تعذر تحميل البيانات.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (removeImages.length) fd.append('remove_images', JSON.stringify(removeImages));
      imageFiles.forEach(f => fd.append('images', f));
      await API.put(`/api/facilities/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowEditModal(false); setEditId(null); resetForm(); fetchFacilities();
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تعديل المرفق.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المرفق؟')) return;
    try {
      await API.delete(`/api/facilities/${id}`);
      fetchFacilities();
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر حذف المرفق.');
    }
  };

  const handleViewBookings = async (facility) => {
    try {
      const res = await API.get(`/api/facilities/${facility.id}/bookings`);
      if (res.data.success) setBookings(res.data.data);
      setBookingsFacility(facility);
      setShowBookingsModal(true);
    } catch (err) {
      alert('تعذر تحميل الحجوزات.');
    }
  };

  const handleBookingStatus = async (bookingId, status) => {
    try {
      await API.put(`/api/facilities/bookings/${bookingId}/status`, { status });
      const res = await API.get(`/api/facilities/${bookingsFacility.id}/bookings`);
      if (res.data.success) setBookings(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تحديث الحجز.');
    }
  };

  const getCategoryInfo = (cat) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];

  return (
    <div style={styles.container}>
      <Topbar title="مرافق الكمباوند" />
      <div style={styles.content}>
        <div style={styles.actionsBar}>
          <button onClick={() => { resetForm(); setShowAddModal(true); }} style={styles.addBtn}>
            <Plus size={18} style={{ marginLeft: '8px' }} />
            <span>إضافة مرفق</span>
          </button>
          <div style={styles.viewToggle}>
            <button onClick={() => setViewMode('table')} style={{ ...styles.toggleBtn, ...(viewMode === 'table' ? styles.toggleActive : {}) }} title="جدول">
              <List size={16} />
            </button>
            <button onClick={() => setViewMode('card')} style={{ ...styles.toggleBtn, ...(viewMode === 'card' ? styles.toggleActive : {}) }} title="بطاقات">
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.center}>جاري التحميل...</div>
        ) : facilities.length === 0 ? (
          <div style={styles.center}>لا توجد مرافق مسجلة</div>
        ) : viewMode === 'card' ? (
          <div style={styles.facilitiesCardGrid}>
            {facilities.map((f) => {
              const cat = getCategoryInfo(f.category);
              return (
                <div key={f.id} className="glass-panel" style={styles.facilityCard}>
                  <div style={styles.facilityCardImgWrap}>
                    {f.images && f.images.length > 0
                      ? <img src={f.images[0]} alt={f.name_ar || f.name} style={styles.facilityCardImg} />
                      : <div style={styles.facilityCardIcon}>{cat.icon}</div>
                    }
                    <span style={{ ...styles.facilityCardBadge, backgroundColor: f.is_active ? '#10b98120' : '#ef444420', color: f.is_active ? '#10b981' : '#ef4444' }}>
                      {f.is_active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                  <div style={styles.facilityCardBody}>
                    <div style={styles.facilityCardTitle}>{f.name_ar || f.name}</div>
                    <div style={styles.facilityCardCat}>{cat.icon} {cat.label}</div>
                    {f.description && <div style={styles.facilityCardDesc}>{f.description.substring(0, 80)}{f.description.length > 80 ? '...' : ''}</div>}
                    <div style={styles.facilityCardStats}>
                      <span><Users size={12} style={{ marginLeft: '4px' }} />{f.max_capacity} شخص</span>
                      {f.opening_time && <span><Clock size={12} style={{ marginLeft: '4px' }} />{f.opening_time?.substring(0, 5)} - {f.closing_time?.substring(0, 5)}</span>}
                    </div>
                    <div style={styles.facilityCardActions}>
                      <button onClick={() => handleViewBookings(f)} style={styles.viewBookingsBtn} title="الحجوزات">
                        <Calendar size={14} style={{ marginLeft: '4px' }} />حجوزات
                      </button>
                      <button onClick={() => handleEdit(f.id)} style={styles.editBtn} title="تعديل"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(f.id)} style={styles.deleteBtn} title="حذف"><Trash2 size={14} /></button>
                    </div>
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
                  <th style={styles.th}>المرفق</th>
                  <th style={styles.th}>الفئة</th>
                  <th style={styles.th}>السعة</th>
                  <th style={styles.th}>المواعيد</th>
                  <th style={styles.th}>الحالة</th>
                  <th style={styles.th}>الحجوزات</th>
                  <th style={styles.th}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((f) => {
                  const cat = getCategoryInfo(f.category);
                  return (
                    <tr key={f.id} style={styles.trRow}>
                      <td style={styles.td}>
                        <div style={styles.facilityInfo}>
                          {f.images && f.images.length > 0 ? (
                            <img src={f.images[0]} alt="" style={styles.facilityImg} />
                          ) : (
                            <div style={styles.facilityIcon}>{cat.icon}</div>
                          )}
                          <div>
                            <strong>{f.name_ar || f.name}</strong>
                            {f.name && f.name_ar && <span style={styles.enName}>{f.name}</span>}
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.catBadge}>{cat.icon} {cat.label}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.statChip}>
                          <Users size={14} style={{ marginLeft: '6px', color: '#3b82f6' }} />
                          <span>{f.max_capacity}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        {f.opening_time && f.closing_time ? (
                          <div style={styles.statChip}>
                            <Clock size={14} style={{ marginLeft: '6px', color: '#f59e0b' }} />
                            <span>{f.opening_time?.substring(0, 5)} - {f.closing_time?.substring(0, 5)}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#6b7280', fontSize: '13px' }}>--</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, backgroundColor: f.is_active ? '#10b98120' : '#ef444420', color: f.is_active ? '#10b981' : '#ef4444' }}>
                          {f.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button onClick={() => handleViewBookings(f)} style={styles.bookingsBtn} title="عرض الحجوزات">
                          <Calendar size={15} style={{ marginLeft: '4px' }} />
                          <span>عرض</span>
                        </button>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionBtns}>
                          <button onClick={() => handleEdit(f.id)} style={styles.editBtn} title="تعديل">
                            <Edit size={15} />
                          </button>
                          <button onClick={() => handleDelete(f.id)} style={styles.deleteBtn} title="حذف">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Facility Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>إضافة مرفق جديد</h3>
            <form onSubmit={handleAdd} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>الاسم (عربي) *</label>
                <input name="name_ar" required value={form.name_ar} onChange={handleFormChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الاسم (إنجليزي)</label>
                <input name="name" value={form.name} onChange={handleFormChange} style={styles.input} />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الفئة *</label>
                  <select name="category" value={form.category} onChange={handleFormChange} style={styles.input}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>السعة القصوى</label>
                  <input name="max_capacity" type="number" min="1" value={form.max_capacity} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الوصف</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} style={{ ...styles.input, minHeight: '80px', padding: '10px 12px', resize: 'vertical' }} />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>وقت الفتح</label>
                  <input name="opening_time" type="time" value={form.opening_time} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>وقت الإغلاق</label>
                  <input name="closing_time" type="time" value={form.closing_time} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الصور</label>
                <div style={styles.imageUpload}>
                  <input ref={imageRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} />
                  <button type="button" onClick={() => imageRef.current?.click()} style={styles.uploadBtn}>
                    <Camera size={20} />
                    <span>إضافة صور</span>
                  </button>
                </div>
                {imagePreviews.length > 0 && (
                  <div style={styles.previewGrid}>
                    {imagePreviews.map((p, i) => (
                      <div key={i} style={styles.previewItem}>
                        <img src={p} alt="" style={styles.previewImg} />
                        <button type="button" onClick={() => removeImage(i)} style={styles.removeImgBtn}><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>إضافة</button>
                <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} style={styles.cancelBtn}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Facility Modal */}
      {showEditModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>تعديل المرفق</h3>
            <form onSubmit={handleUpdate} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>الاسم (عربي) *</label>
                <input name="name_ar" required value={form.name_ar} onChange={handleFormChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الاسم (إنجليزي)</label>
                <input name="name" value={form.name} onChange={handleFormChange} style={styles.input} />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الفئة *</label>
                  <select name="category" value={form.category} onChange={handleFormChange} style={styles.input}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>السعة القصوى</label>
                  <input name="max_capacity" type="number" min="1" value={form.max_capacity} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الوصف</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} style={{ ...styles.input, minHeight: '80px', padding: '10px 12px', resize: 'vertical' }} />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>وقت الفتح</label>
                  <input name="opening_time" type="time" value={form.opening_time} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>وقت الإغلاق</label>
                  <input name="closing_time" type="time" value={form.closing_time} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الحالة</label>
                <div style={styles.checkboxRow}>
                  <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleFormChange} id="is_active" style={styles.checkbox} />
                  <label htmlFor="is_active" style={{ color: '#e5e7eb', fontSize: '14px' }}>نشط</label>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>الصور</label>
                {(() => {
                  const existing = editId ? facilities.find(f => f.id === editId) : null;
                  return existing?.images?.length > 0 ? (
                    <div style={styles.previewGrid}>
                      {existing.images.map((url, i) => (
                        <div key={i} style={{ ...styles.previewItem, opacity: removeImages.includes(i) ? 0.4 : 1, position: 'relative' }}>
                          <img src={url} alt="" style={styles.previewImg} />
                          {removeImages.includes(i) ? (
                            <button type="button" onClick={() => setRemoveImages(prev => prev.filter(x => x !== i))} style={{ ...styles.removeImgBtn, backgroundColor: '#10b981' }}><Eye size={12} /></button>
                          ) : (
                            <button type="button" onClick={() => removeExistingImage(i)} style={styles.removeImgBtn}><X size={12} /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}
                <div style={styles.imageUpload}>
                  <input ref={imageRef} type="file" accept="image/*" multiple onChange={handleImageSelect} style={{ display: 'none' }} />
                  <button type="button" onClick={() => imageRef.current?.click()} style={styles.uploadBtn}>
                    <Camera size={20} />
                    <span>إضافة صور جديدة</span>
                  </button>
                </div>
                {imagePreviews.length > 0 && (
                  <div style={styles.previewGrid}>
                    {imagePreviews.map((p, i) => (
                      <div key={i} style={styles.previewItem}>
                        <img src={p} alt="" style={styles.previewImg} />
                        <button type="button" onClick={() => removeImage(i)} style={styles.removeImgBtn}><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>حفظ التعديلات</button>
                <button type="button" onClick={() => { setShowEditModal(false); setEditId(null); resetForm(); }} style={styles.cancelBtn}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bookings Modal */}
      {showBookingsModal && bookingsFacility && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={{ ...styles.modalContent, maxWidth: '650px' }}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>حجوزات: {bookingsFacility.name_ar || bookingsFacility.name}</h3>
              <button onClick={() => { setShowBookingsModal(false); setBookings([]); setBookingsFacility(null); }} style={styles.closeBtn}><X size={18} /></button>
            </div>
            {bookings.length === 0 ? (
              <div style={{ ...styles.center, padding: '20px' }}>لا توجد حجوزات لهذا المرفق</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>المستأجر</th>
                      <th style={styles.th}>التاريخ</th>
                      <th style={styles.th}>الوقت</th>
                      <th style={styles.th}>الحالة</th>
                      <th style={styles.th}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id} style={styles.trRow}>
                        <td style={styles.td}>{b.tenant_name}<br /><span style={{ fontSize: '11px', color: '#9ca3af' }}>{b.tenant_phone}</span></td>
                        <td style={styles.td}>{new Date(b.booking_date).toLocaleDateString('ar-SA')}</td>
                        <td style={styles.td}>{b.start_time?.substring(0, 5)} - {b.end_time?.substring(0, 5)}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: b.status === 'confirmed' ? '#3b82f620' : b.status === 'completed' ? '#10b98120' : b.status === 'cancelled' ? '#ef444420' : '#f59e0b20',
                            color: b.status === 'confirmed' ? '#3b82f6' : b.status === 'completed' ? '#10b981' : b.status === 'cancelled' ? '#ef4444' : '#f59e0b'
                          }}>
                            {b.status === 'confirmed' ? 'مؤكد' : b.status === 'completed' ? 'مكتمل' : b.status === 'cancelled' ? 'ملغي' : 'معلق'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {b.status === 'confirmed' && (
                            <div style={styles.actionBtns}>
                              <button onClick={() => handleBookingStatus(b.id, 'completed')} style={{ ...styles.editBtn, color: '#10b981', backgroundColor: '#10b98120' }} title="إكمال">م</button>
                              <button onClick={() => handleBookingStatus(b.id, 'cancelled')} style={styles.deleteBtn} title="إلغاء">إ</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
  actionsBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { height: '42px', padding: '0 20px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', cursor: 'pointer' },
  viewToggle: { display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px' },
  toggleBtn: { width: '34px', height: '34px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  toggleActive: { backgroundColor: '#3b82f6', color: '#fff' },
  // Card styles for Facilities
  facilitiesCardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  facilityCard: { borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' },
  facilityCardImgWrap: { position: 'relative', height: '160px', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)' },
  facilityCardImg: { width: '100%', height: '100%', objectFit: 'cover' },
  facilityCardIcon: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', backgroundColor: 'rgba(59,130,246,0.08)' },
  facilityCardBadge: { position: 'absolute', top: '10px', right: '10px', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  facilityCardBody: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right', direction: 'rtl' },
  facilityCardTitle: { fontSize: '16px', fontWeight: '700', color: '#f9fafb' },
  facilityCardCat: { fontSize: '12px', color: '#9ca3af' },
  facilityCardDesc: { fontSize: '12px', color: '#6b7280', lineHeight: '1.5' },
  facilityCardStats: { display: 'flex', gap: '14px', fontSize: '12px', color: '#9ca3af', alignItems: 'center' },
  facilityCardActions: { display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' },
  viewBookingsBtn: { flex: 1, height: '32px', padding: '0 10px', backgroundColor: 'rgba(139,92,246,0.1)', border: 'none', borderRadius: '6px', color: '#a78bfa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontSize: '12px', justifyContent: 'center' },
  tableCard: { overflowX: 'auto', borderRadius: '12px' },
  table: { width: '100%', borderCollapse: 'collapse', direction: 'rtl', textAlign: 'right' },
  thRow: { borderBottom: '1px solid rgba(255,255,255,0.05)' },
  th: { padding: '16px', color: '#9ca3af', fontWeight: '500', fontSize: '13px' },
  trRow: { borderBottom: '1px solid rgba(255,255,255,0.03)' },
  td: { padding: '14px 16px', color: '#e5e7eb', fontSize: '14px' },
  facilityInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  facilityImg: { width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' },
  facilityIcon: { width: '44px', height: '44px', borderRadius: '8px', backgroundColor: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' },
  enName: { display: 'block', fontSize: '11px', color: '#9ca3af', marginTop: '2px' },
  catBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '13px', backgroundColor: 'rgba(59,130,246,0.1)', color: '#93c5fd', display: 'inline-block', whiteSpace: 'nowrap' },
  statChip: { display: 'flex', alignItems: 'center', fontSize: '13px' },
  badge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', display: 'inline-block' },
  bookingsBtn: { height: '30px', padding: '0 12px', backgroundColor: 'rgba(139,92,246,0.1)', border: 'none', borderRadius: '6px', color: '#a78bfa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontSize: '13px' },
  actionBtns: { display: 'flex', gap: '6px' },
  editBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: '32px', height: '32px', borderRadius: '6px', border: 'none', backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalContent: { width: '100%', maxWidth: '520px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '18px', fontWeight: '600', color: '#f9fafb', textAlign: 'right' },
  closeBtn: { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', display: 'flex' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' },
  label: { fontSize: '12px', color: '#9ca3af' },
  input: { height: '42px', padding: '0 12px', backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f9fafb', fontSize: '13px', outline: 'none', textAlign: 'right' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' },
  checkbox: { width: '16px', height: '16px', accentColor: '#3b82f6' },
  imageUpload: { display: 'flex', justifyContent: 'center' },
  uploadBtn: { height: '44px', padding: '0 24px', backgroundColor: 'rgba(59,130,246,0.1)', border: '1px dashed rgba(59,130,246,0.3)', borderRadius: '8px', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' },
  previewGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' },
  previewItem: { position: 'relative', width: '72px', height: '72px' },
  previewImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' },
  removeImgBtn: { position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalActions: { display: 'flex', gap: '12px', marginTop: '8px' },
  saveBtn: { flex: 1, height: '44px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer' },
  cancelBtn: { flex: 1, height: '44px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#9ca3af', fontWeight: '600', cursor: 'pointer' }
};

export default Facilities;
