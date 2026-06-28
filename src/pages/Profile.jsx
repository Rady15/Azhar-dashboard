import React, { useState, useRef, useContext, useEffect } from 'react';
import Topbar from '../components/Topbar';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';
import {
  User, Camera, Lock, Phone, Mail, Save, CheckCircle, AlertCircle, Eye, EyeOff
} from 'lucide-react';

const Profile = () => {
  const { user, updateUserState } = useContext(AuthContext);
  const fileInputRef = useRef(null);

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: ''
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user) {
      setForm(f => ({
        ...f,
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
      setAvatarPreview(user.avatar_url || null);
    }
  }, [user]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirm_password) {
      showToast('كلمات المرور غير متطابقة', 'error');
      return;
    }
    if (form.password && form.password.length < 8) {
      showToast('يجب أن تكون كلمة المرور 8 أحرف على الأقل', 'error');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('full_name', form.full_name);
      fd.append('email', form.email);
      fd.append('phone', form.phone);
      if (form.password) fd.append('password', form.password);
      if (avatarFile) fd.append('image', avatarFile);

      const res = await API.put('/api/auth/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        updateUserState(res.data.data);
        showToast('✅ تم تحديث الملف الشخصي بنجاح');
        setForm(f => ({ ...f, password: '', confirm_password: '' }));
        setAvatarFile(null);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'تعذر تحديث الملف الشخصي', 'error');
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.full_name ? user.full_name.substring(0, 2) : 'أد';
  const roleLabel = user?.role === 'super_admin' ? 'سوبر أدمن'
    : user?.role === 'admin' ? 'مدير النظام'
    : user?.role === 'staff' ? 'فريق الصيانة'
    : user?.role === 'tenant' ? 'مستأجر'
    : 'مستخدم';

  return (
    <div style={styles.container}>
      <Topbar title="الملف الشخصي" />
      <div style={styles.content}>

        {/* Hero Banner */}
        <div style={styles.heroBanner}>
          <div style={styles.heroBg} />
          <div style={styles.heroContent}>
            {/* Avatar */}
            <div style={styles.avatarWrapper} onClick={() => fileInputRef.current?.click()} title="تغيير الصورة الشخصية">
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={styles.avatarImg} />
                : <div style={styles.avatarPlaceholder}>{initials}</div>
              }
              <div style={styles.cameraOverlay}>
                <Camera size={22} color="#fff" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            <div style={styles.heroInfo}>
              <h2 style={styles.heroName}>{user?.full_name || 'المستخدم'}</h2>
              <span style={styles.heroBadge}>{roleLabel}</span>
              <p style={styles.heroEmail}>{user?.email || '—'}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={styles.formGrid}>

          {/* Personal Info */}
          <div className="glass-panel" style={styles.card}>
            <div style={styles.cardHeader}>
              <User size={18} color="#3b82f6" />
              <h3 style={styles.cardTitle}>المعلومات الشخصية</h3>
            </div>
            <form onSubmit={handleSubmit} style={styles.form} id="profile-form">
              <div style={styles.formGroup}>
                <label style={styles.label}>الاسم الكامل</label>
                <input
                  name="full_name"
                  type="text"
                  required
                  value={form.full_name}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="أدخل اسمك الكامل"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}><Mail size={13} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />البريد الإلكتروني</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="example@mail.com"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}><Phone size={13} style={{ marginLeft: '6px', verticalAlign: 'middle' }} />رقم الجوال</label>
                  <input
                    name="phone"
                    type="text"
                    value={form.phone}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                  />
                </div>
              </div>
            </form>
          </div>

          {/* Password */}
          <div className="glass-panel" style={styles.card}>
            <div style={styles.cardHeader}>
              <Lock size={18} color="#8b5cf6" />
              <h3 style={styles.cardTitle}>تغيير كلمة المرور</h3>
            </div>
            <p style={styles.pwHint}>اتركها فارغة إذا لم تريد تغيير كلمة المرور الحالية</p>
            <form style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>كلمة المرور الجديدة</label>
                <div style={styles.passwordWrapper}>
                  <input
                    name="password"
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    style={{ ...styles.input, paddingRight: '42px' }}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} style={styles.eyeBtn}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>تأكيد كلمة المرور</label>
                <div style={styles.passwordWrapper}>
                  <input
                    name="confirm_password"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirm_password}
                    onChange={handleChange}
                    style={{
                      ...styles.input,
                      paddingRight: '42px',
                      borderColor: form.confirm_password && form.password !== form.confirm_password
                        ? '#ef4444' : undefined
                    }}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.confirm_password && form.password !== form.confirm_password && (
                  <span style={styles.errorText}>كلمات المرور غير متطابقة</span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Save Button */}
        <div style={styles.saveRow}>
          <button
            form="profile-form"
            type="submit"
            onClick={handleSubmit}
            disabled={saving}
            style={{ ...styles.saveBtn, opacity: saving ? 0.7 : 1 }}
          >
            {saving
              ? 'جاري الحفظ...'
              : <><Save size={16} style={{ marginLeft: '8px' }} />حفظ التعديلات</>
            }
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'error' ? '#dc2626' : '#059669'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span style={{ marginRight: '10px' }}>{toast.msg}</span>
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

  // Hero Banner
  heroBanner: {
    position: 'relative',
    borderRadius: '20px',
    overflow: 'hidden',
    minHeight: '200px',
    display: 'flex',
    alignItems: 'center'
  },
  heroBg: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(139,92,246,0.2) 50%, rgba(16,185,129,0.15) 100%)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '20px'
  },
  heroContent: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '28px',
    padding: '36px 40px',
    width: '100%',
    direction: 'rtl'
  },
  avatarWrapper: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    overflow: 'hidden',
    position: 'relative',
    cursor: 'pointer',
    border: '3px solid rgba(59,130,246,0.6)',
    boxShadow: '0 0 30px rgba(59,130,246,0.3)',
    flexShrink: 0
  },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '32px',
    fontWeight: '700'
  },
  cameraOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    opacity: 0,
    ':hover': { backgroundColor: 'rgba(0,0,0,0.5)', opacity: 1 }
  },
  heroInfo: { display: 'flex', flexDirection: 'column', gap: '8px' },
  heroName: { fontSize: '26px', fontWeight: '700', color: '#f9fafb', margin: 0 },
  heroBadge: {
    display: 'inline-block',
    backgroundColor: 'rgba(59,130,246,0.15)',
    border: '1px solid rgba(59,130,246,0.3)',
    color: '#60a5fa',
    padding: '4px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    width: 'fit-content'
  },
  heroEmail: { fontSize: '14px', color: '#9ca3af', margin: 0 },

  // Form
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px'
  },
  card: { borderRadius: '16px', padding: '28px' },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    direction: 'rtl'
  },
  cardTitle: { fontSize: '16px', fontWeight: '600', color: '#f9fafb', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' },
  label: { fontSize: '12px', color: '#9ca3af', fontWeight: '500' },
  input: {
    height: '44px',
    padding: '0 14px',
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#f9fafb',
    fontSize: '14px',
    outline: 'none',
    textAlign: 'right',
    transition: 'border-color 0.2s'
  },
  pwHint: { fontSize: '12px', color: '#6b7280', textAlign: 'right', marginBottom: '12px', marginTop: '-8px' },
  passwordWrapper: { position: 'relative' },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  errorText: { fontSize: '11px', color: '#ef4444', marginTop: '2px' },

  saveRow: { display: 'flex', justifyContent: 'flex-end' },
  saveBtn: {
    height: '48px',
    padding: '0 32px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
    transition: 'opacity 0.2s'
  },

  toast: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: '500',
    zIndex: 9999,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
  }
};

export default Profile;
