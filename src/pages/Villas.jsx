import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import Topbar from '../components/Topbar';
import { Home, Plus, Search, Trash2, Edit, Image, X, LayoutGrid, List } from 'lucide-react';

const INITIAL_FORM = { unit_number: '', block: 'A', villa_type: 'villa', bedrooms: 4, bathrooms: 3, area_sqm: 300, monthly_rent: 4000, annual_rent: '', notes: '' };

const Villas = () => {
  const [villas, setVillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [block, setBlock] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [removePhotos, setRemovePhotos] = useState([]);
  const fileRef = useRef(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'

  const fetchVillas = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/villas', {
        params: { search, status, block }
      });
      if (res.data.success) {
        setVillas(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVillas(); }, [search, status, block]);

  const handleFormChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({ ...INITIAL_FORM });
    setFiles([]);
    setPreviews([]);
    setExistingPhotos([]);
    setRemovePhotos([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    const urls = selected.map(f => URL.createObjectURL(f));
    setPreviews(urls);
  };

  const buildFormData = () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    files.forEach(f => fd.append('images', f));
    if (removePhotos.length > 0) fd.append('remove_photos', JSON.stringify(removePhotos));
    return fd;
  };

  const handleAddVilla = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/api/villas', buildFormData(), {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) { setShowAddModal(false); resetForm(); fetchVillas(); }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر إضافة الفيلا.');
    }
  };

  const handleEdit = async (id) => {
    try {
      const res = await API.get(`/api/villas/${id}`);
      if (res.data.success) {
        const v = res.data.data;
        setForm({
          unit_number: v.unit_number || '',
          block: v.block || 'A',
          villa_type: v.villa_type || 'villa',
          bedrooms: v.bedrooms || 4,
          bathrooms: v.bathrooms || 3,
          area_sqm: v.area_sqm || 300,
          monthly_rent: v.monthly_rent || 4000,
          annual_rent: v.annual_rent || '',
          notes: v.notes || ''
        });
        setExistingPhotos(v.photos || []);
        setRemovePhotos([]);
        setFiles([]);
        setPreviews([]);
        setEditId(id);
        setShowEditModal(true);
      }
    } catch (err) {
      alert('تعذر تحميل بيانات الفيلا.');
    }
  };

  const handleUpdateVilla = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put(`/api/villas/${editId}`, buildFormData(), {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) { setShowEditModal(false); setEditId(null); resetForm(); fetchVillas(); }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تعديل الفيلا.');
    }
  };

  const handleRemovePhoto = (idx) => {
    setRemovePhotos([...removePhotos, idx]);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذه الفيلا؟')) return;
    try {
      const res = await API.delete(`/api/villas/${id}`);
      if (res.data.success) fetchVillas();
    } catch (err) {
      alert(err.response?.data?.message || 'لا يمكن حذف فيلا مشغولة حالياً.');
    }
  };

  return (
    <div style={styles.container}>
      <Topbar title="دليل الفلل" />

      <div style={styles.content}>
        {/* Actions Bar */}
        <div style={styles.actionsBar}>
          <button onClick={() => setShowAddModal(true)} style={styles.addBtn}>
            <Plus size={18} style={{ marginLeft: '8px' }} />
            <span>إضافة فيلا جديدة</span>
          </button>

          <div style={styles.filters}>
            <div style={styles.inputWrapper}>
              <Search size={16} style={styles.inputIcon} />
              <input
                type="text"
                placeholder="البحث عن فيلا..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={styles.select}
            >
              <option value="">الحالة (الكل)</option>
              <option value="vacant">شاغرة</option>
              <option value="occupied">مشغولة</option>
              <option value="maintenance">تحت الصيانة</option>
            </select>

            <select
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              style={styles.select}
            >
              <option value="">المجمع (الكل)</option>
              <option value="A">Block A</option>
              <option value="B">Block B</option>
              <option value="C">Block C</option>
              <option value="D">Block D</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div style={styles.viewToggle}>
            <button onClick={() => setViewMode('table')} style={{ ...styles.toggleBtn, ...(viewMode === 'table' ? styles.toggleActive : {}) }}>
              <List size={16} />
            </button>
            <button onClick={() => setViewMode('card')} style={{ ...styles.toggleBtn, ...(viewMode === 'card' ? styles.toggleActive : {}) }}>
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Table/Grid view */}
        {loading ? (
          <div style={styles.center}>جاري تحميل قائمة الفلل...</div>
        ) : viewMode === 'card' ? (
          <div style={styles.cardGrid}>
            {villas.map((villa) => (
              <div key={villa.id} className="glass-panel" style={styles.villaCard}>
                <div style={styles.cardImgWrap}>
                  {villa.photos && villa.photos[0]
                    ? <img src={villa.photos[0]} alt={villa.unit_number} style={styles.cardImg} />
                    : <div style={styles.cardImgPlaceholder}><Home size={36} color="#374151" /></div>
                  }
                  <span style={{
                    ...styles.cardBadge,
                    backgroundColor: villa.status === 'vacant' ? '#10b98120' : villa.status === 'occupied' ? '#3b82f620' : '#f59e0b20',
                    color: villa.status === 'vacant' ? '#10b981' : villa.status === 'occupied' ? '#3b82f6' : '#f59e0b'
                  }}>
                    {villa.status === 'vacant' ? 'شاغرة' : villa.status === 'occupied' ? 'مشغولة' : 'صيانة'}
                  </span>
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.cardTitle}>{villa.unit_number} — Block {villa.block}</div>
                  <div style={styles.cardSub}>{villa.villa_type === 'villa' ? 'فيلا مستقلة' : villa.villa_type === 'duplex' ? 'دوبلكس' : 'شقة'} • {villa.bedrooms} غرف • {villa.area_sqm} م²</div>
                  {villa.tenant_name && <div style={styles.cardTenant}>👤 {villa.tenant_name}</div>}
                  <div style={styles.cardPrice}>SAR {parseFloat(villa.monthly_rent || 0).toLocaleString()}<span style={styles.cardPriceLabel}>/شهر</span></div>
                  <div style={styles.cardActions}>
                    <button onClick={() => handleEdit(villa.id)} style={styles.editBtn}><Edit size={15} /></button>
                    <button onClick={() => handleDelete(villa.id)} style={styles.deleteBtn}><Trash2 size={15} /></button>
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
                  <th style={styles.th}>رقم الوحدة</th>
                  <th style={styles.th}>المجمع</th>
                  <th style={styles.th}>النوع</th>
                  <th style={styles.th}>الحالة</th>
                  <th style={styles.th}>المستأجر الحالي</th>
                  <th style={styles.th}>المساحة (م²)</th>
                  <th style={styles.th}>الإيجار الشهري</th>
                  <th style={styles.th}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {villas.map((villa) => (
                  <tr key={villa.id} style={styles.trRow}>
                    <td style={styles.td}><strong>{villa.unit_number}</strong></td>
                    <td style={styles.td}>{villa.block}</td>
                    <td style={styles.td}>{villa.villa_type === 'villa' ? 'فيلا' : 'دوبلكس'}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.badge,
                        backgroundColor: villa.status === 'vacant' ? '#10b98120' : villa.status === 'occupied' ? '#3b82f620' : '#f59e0b20',
                        color: villa.status === 'vacant' ? '#10b981' : villa.status === 'occupied' ? '#3b82f6' : '#f59e0b'
                      }}>
                        {villa.status === 'vacant' ? 'شاغرة' : villa.status === 'occupied' ? 'مشغولة' : 'صيانة'}
                      </span>
                    </td>
                    <td style={styles.td}>{villa.tenant_name || '—'}</td>
                    <td style={styles.td}>{villa.area_sqm}</td>
                    <td style={styles.td}>SAR {parseFloat(villa.monthly_rent).toLocaleString()}</td>
                    <td style={styles.td}>
                      <div style={styles.actionBtns}>
                        <button onClick={() => handleEdit(villa.id)} style={styles.editBtn}>
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(villa.id)} style={styles.deleteBtn}>
                          <Trash2 size={16} />
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

      {/* Villa Form Modal (shared for Add/Edit) */}
      {(showAddModal || showEditModal) && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{showEditModal ? 'تعديل الفيلا' : 'إضافة فيلا جديدة'}</h3>
            <form onSubmit={showEditModal ? handleUpdateVilla : handleAddVilla} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>رقم الوحدة</label>
                  <input name="unit_number" type="text" required placeholder="A-15" value={form.unit_number} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>المجمع (Block)</label>
                  <input name="block" type="text" required placeholder="A" value={form.block} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>نوع الوحدة</label>
                  <select name="villa_type" value={form.villa_type} onChange={handleFormChange} style={styles.input}>
                    <option value="villa">فيلا مستقلة</option>
                    <option value="duplex">دوبلكس</option>
                    <option value="apartment">شقة</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>المساحة (م²)</label>
                  <input name="area_sqm" type="number" value={form.area_sqm} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>غرف النوم</label>
                  <input name="bedrooms" type="number" value={form.bedrooms} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>دورات المياه</label>
                  <input name="bathrooms" type="number" value={form.bathrooms} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الإيجار الشهري (SAR)</label>
                  <input name="monthly_rent" type="number" value={form.monthly_rent} onChange={handleFormChange} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>الإيجار السنوي (اختياري)</label>
                  <input name="annual_rent" type="number" value={form.annual_rent} onChange={handleFormChange} style={styles.input} />
                </div>
              </div>
              {/* Image Upload */}
              <div style={styles.formGroup}>
                <label style={styles.label}>الصور</label>
                <div style={styles.imageGrid}>
                  {/* Existing photos (edit mode) */}
                  {existingPhotos.filter((_, i) => !removePhotos.includes(i)).map((url, i) => (
                    <div key={i} style={styles.imageThumb}>
                      <img src={url} alt="" style={styles.thumbImg} />
                      <button type="button" onClick={() => handleRemovePhoto(existingPhotos.indexOf(url))} style={styles.removeImgBtn}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {/* New file previews */}
                  {previews.map((url, i) => (
                    <div key={`p${i}`} style={styles.imageThumb}>
                      <img src={url} alt="" style={styles.thumbImg} />
                    </div>
                  ))}
                  {/* Upload button */}
                  <button type="button" onClick={() => fileRef.current?.click()} style={styles.uploadBtn}>
                    <Image size={20} />
                    <span style={{ fontSize: '11px', marginTop: '4px' }}>إضافة صور</span>
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>ملاحظات</label>
                <textarea name="notes" value={form.notes} onChange={handleFormChange} style={{ ...styles.input, height: '80px', padding: '12px' }} />
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.saveBtn}>{showEditModal ? 'تحديث' : 'حفظ'}</button>
                <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditId(null); resetForm(); }} style={styles.cancelBtn}>إلغاء</button>
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
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  addBtn: {
    height: '42px',
    padding: '0 20px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer'
  },
  filters: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    right: '12px',
    color: '#6b7280'
  },
  searchInput: {
    width: '200px',
    height: '40px',
    backgroundColor: '#111827',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '0 32px 0 16px',
    color: '#f9fafb',
    fontSize: '13px',
    outline: 'none',
    textAlign: 'right'
  },
  select: {
    height: '40px',
    padding: '0 12px',
    backgroundColor: '#111827',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#f9fafb',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer'
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
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.01)'
    }
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
  actionBtns: {
    display: 'flex',
    gap: '8px'
  },
  deleteBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  },
  editBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
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
    maxWidth: '520px',
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
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
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
    gap: '12px',
    marginTop: '12px'
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
  imageGrid: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  imageThumb: {
    width: '80px',
    height: '80px',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  removeImgBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(239,68,68,0.8)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  uploadBtn: {
    width: '80px',
    height: '80px',
    borderRadius: '8px',
    border: '2px dashed rgba(255,255,255,0.15)',
    backgroundColor: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  viewToggle: { display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' },
  toggleBtn: { width: '34px', height: '34px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  toggleActive: { backgroundColor: '#3b82f6', color: '#fff' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  villaCard: { borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s' },
  cardImgWrap: { position: 'relative', height: '180px', overflow: 'hidden' },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover' },
  cardImgPlaceholder: { width: '100%', height: '100%', backgroundColor: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardBadge: { position: 'absolute', top: '10px', right: '10px', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', backdropFilter: 'blur(8px)' },
  cardBody: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' },
  cardTitle: { fontSize: '16px', fontWeight: '700', color: '#f9fafb' },
  cardSub: { fontSize: '12px', color: '#9ca3af' },
  cardTenant: { fontSize: '13px', color: '#6b7280' },
  cardPrice: { fontSize: '20px', fontWeight: '700', color: '#3b82f6', marginTop: '4px' },
  cardPriceLabel: { fontSize: '13px', color: '#9ca3af', marginRight: '4px' },
  cardActions: { display: 'flex', gap: '8px', marginTop: '8px' }
};

export default Villas;
