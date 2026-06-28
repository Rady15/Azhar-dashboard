import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Search, CheckCheck, Trash2, Megaphone, CreditCard, AlertTriangle, Info, Wrench, MessageSquare } from 'lucide-react';

const TYPE_ICONS = {
  payment_received:   { icon: CreditCard,     color: '#10b981' },
  payment_due:        { icon: CreditCard,     color: '#f59e0b' },
  announcement:       { icon: Megaphone,      color: '#3b82f6' },
  emergency:          { icon: AlertTriangle,  color: '#ef4444' },
  maintenance_update: { icon: Wrench,         color: '#f59e0b' },
  complaint_reply:    { icon: MessageSquare,  color: '#8b5cf6' },
  system:             { icon: Info,           color: '#6b7280' }
};

const Topbar = ({ title }) => {
  const { user, updateUserState } = useContext(AuthContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        password: ''
      });
      setProfilePreview(user.avatar_url || null);
    }
  }, [user, showProfileModal]);

  const handleProfileChange = (e) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleProfileFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileFile(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.append('full_name', profileForm.full_name);
      fd.append('email', profileForm.email);
      fd.append('phone', profileForm.phone);
      if (profileForm.password) fd.append('password', profileForm.password);
      if (profileFile) fd.append('image', profileFile);

      const res = await API.put('/api/auth/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        updateUserState(res.data.data);
        setShowProfileModal(false);
        alert('تم تحديث الملف الشخصي بنجاح');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر تحديث الملف الشخصي');
    } finally {
      setSavingProfile(false);
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const [compoundRes, unreadRes] = await Promise.all([
        API.get('/api/notifications/my', { params: { compound: true, page: 1, limit: 8 } }),
        API.get('/api/notifications/my', { params: { unread_only: true } })
      ]);
      if (compoundRes.data.success) {
        setNotifications(compoundRes.data.data);
      }
      if (unreadRes.data.success) {
        setUnreadCount(unreadRes.data.unread_count || 0);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = async () => {
    try {
      await API.put('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (_) {}
  };

  const markRead = async (id) => {
    try {
      await API.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const removeNotif = async (id, e) => {
    e.stopPropagation();
    try {
      await API.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      const removed = notifications.find(n => n.id === id);
      if (removed && !removed.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const typeLabel = (t) => {
    const map = {
      payment_received:   'دفعة مستلمة',
      payment_due:        'استحقاق دفع',
      announcement:       'إعلان',
      emergency:          'طوارئ',
      maintenance_update: 'صيانة',
      complaint_reply:    'شكوى',
      system:             'النظام'
    };
    return map[t] || t;
  };

  const timeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} د`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} س`;
    const days = Math.floor(hrs / 24);
    return `منذ ${days} ي`;
  };

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <h1 style={styles.title}>{title}</h1>
      </div>

      <div style={styles.right}>
        <div style={styles.searchContainer}>
          <Search size={16} style={styles.searchIcon} />
          <input type="text" placeholder="بحث..." style={styles.searchInput} />
        </div>

        <div ref={dropdownRef} style={styles.bellWrapper}>
          <button onClick={() => setShowDropdown(!showDropdown)} style={styles.iconBtn}>
            <Bell size={18} />
            {unreadCount > 0 && <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>

          {showDropdown && (
            <div className="glass-panel" style={styles.dropdown}>
              <div style={styles.dropdownHeader}>
                <span style={styles.dropdownTitle}>الإشعارات</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={styles.markAllBtn}>
                    <CheckCheck size={14} /> تحديد الكل كمقروء
                  </button>
                )}
              </div>

              <div style={styles.dropdownList}>
                {notifications.length === 0 ? (
                  <div style={styles.emptyState}>لا توجد إشعارات</div>
                ) : (
                  notifications.map((n) => {
                    const Icon = (TYPE_ICONS[n.type] && TYPE_ICONS[n.type].icon) || Info;
                    const color = (TYPE_ICONS[n.type] && TYPE_ICONS[n.type].color) || '#9ca3af';
                    return (
                      <div
                        key={n.id}
                        className="notif-item"
                        onClick={() => markRead(n.id)}
                        style={{
                          ...styles.notifItem,
                          backgroundColor: n.is_read ? 'transparent' : 'rgba(59,130,246,0.06)'
                        }}
                      >
                        <div style={{ ...styles.notifIcon, backgroundColor: `${color}15`, color }}>
                          <Icon size={14} />
                        </div>
                        <div style={styles.notifBody}>
                          <div style={styles.notifType}>{typeLabel(n.type)}</div>
                          <div style={styles.notifTitle}>{n.title}</div>
                          <div style={styles.notifTime}>{timeAgo(n.created_at)}</div>
                        </div>
                        <button onClick={(e) => removeNotif(n.id, e)} className="notif-delete-btn" style={styles.deleteBtn}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={styles.dropdownFooter}>
                <button onClick={() => { setShowDropdown(false); navigate('/notifications'); }} style={styles.viewAllBtn}>
                  عرض كل الإشعارات
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.userMenu} onClick={() => setShowProfileModal(true)} title="تعديل الملف الشخصي">
          <div style={styles.avatar}>
            {profilePreview ? (
              <img src={profilePreview} alt="" style={styles.avatarImg} />
            ) : (
              user?.full_name ? user.full_name.substring(0, 2) : 'أد'
            )}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.name}>{user?.full_name || 'مدير النظام'}</div>
            <div style={styles.role}>
              {user?.role === 'super_admin' ? 'سوبر أدمن'
                : user?.role === 'admin' ? 'مدير النظام'
                : user?.role === 'staff' ? 'فريق صيانة'
                : user?.role === 'tenant' ? 'مستأجر'
                : 'مستخدم'}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h3 style={styles.modalTitle}>تعديل الملف الشخصي</h3>
            <form onSubmit={handleUpdateProfile} style={styles.form}>
              <div style={styles.avatarContainer}>
                <div style={styles.avatarEditWrapper} onClick={() => fileInputRef.current?.click()}>
                  {profilePreview ? (
                    <img src={profilePreview} alt="" style={styles.avatarEditPreview} />
                  ) : (
                    <div style={styles.avatarEditPlaceholder}>{profileForm.full_name.substring(0,2)}</div>
                  )}
                  <div style={styles.avatarHoverLabel}>تغيير الصورة</div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>الاسم الكامل</label>
                <input
                  name="full_name"
                  type="text"
                  required
                  value={profileForm.full_name}
                  onChange={handleProfileChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>البريد الإلكتروني</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={handleProfileChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>رقم الجوال</label>
                <input
                  name="phone"
                  type="text"
                  required
                  value={profileForm.phone}
                  onChange={handleProfileChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)</label>
                <input
                  name="password"
                  type="password"
                  placeholder="********"
                  value={profileForm.password}
                  onChange={handleProfileChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.modalActions}>
                <button type="submit" disabled={savingProfile} style={styles.saveBtn}>
                  {savingProfile ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
                <button type="button" onClick={() => setShowProfileModal(false)} style={styles.cancelBtn}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

const styles = {
  header: {
    height: '70px',
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    fontFamily: 'Zain, sans-serif'
  },
  left: { display: 'flex', alignItems: 'center' },
  title: { fontSize: '20px', fontWeight: '600', color: '#f9fafb' },
  right: { display: 'flex', alignItems: 'center', gap: '20px' },
  searchContainer: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', right: '12px', color: '#9ca3af' },
  searchInput: {
    width: '240px', height: '38px', backgroundColor: '#0b0f19',
    border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px',
    padding: '0 36px 0 16px', color: '#f9fafb', fontSize: '13px',
    outline: 'none', transition: 'all 0.2s ease', textAlign: 'right'
  },
  bellWrapper: { position: 'relative' },
  iconBtn: {
    width: '38px', height: '38px', borderRadius: '8px',
    backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.05)',
    color: '#9ca3af', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', position: 'relative',
    transition: 'all 0.2s ease'
  },
  badge: {
    position: 'absolute', top: '-4px', right: '-4px',
    minWidth: '18px', height: '18px', borderRadius: '9px',
    backgroundColor: '#ef4444', color: '#ffffff', fontSize: '10px',
    fontWeight: '700', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '0 4px'
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 8px)', left: '0',
    width: '360px', maxHeight: '480px', display: 'flex',
    flexDirection: 'column', zIndex: 200, overflow: 'hidden',
    animation: 'fadeIn 0.15s ease forwards'
  },
  dropdownHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    direction: 'rtl'
  },
  dropdownTitle: { fontSize: '14px', fontWeight: '600', color: '#f9fafb' },
  markAllBtn: {
    display: 'flex', alignItems: 'center', gap: '4px',
    backgroundColor: 'transparent', border: 'none',
    color: '#3b82f6', fontSize: '12px', cursor: 'pointer'
  },
  dropdownList: {
    flex: 1, overflowY: 'auto', padding: '4px 0'
  },
  emptyState: {
    padding: '40px 16px', textAlign: 'center', color: '#6b7280', fontSize: '13px'
  },
  notifItem: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s',
    direction: 'rtl'
  },
  notifIcon: {
    width: '32px', height: '32px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: '2px'
  },
  notifBody: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: '2px',
    textAlign: 'right'
  },
  notifType: { fontSize: '10px', color: '#6b7280' },
  notifTitle: { fontSize: '13px', color: '#e5e7eb', lineHeight: '1.3' },
  notifTime: { fontSize: '11px', color: '#6b7280', marginTop: '2px' },
  deleteBtn: {
    backgroundColor: 'transparent', border: 'none',
    color: '#4b5563', cursor: 'pointer', padding: '4px',
    borderRadius: '4px', opacity: 0, transition: 'opacity 0.15s',
    flexShrink: 0
  },
  dropdownFooter: {
    padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center'
  },
  viewAllBtn: {
    backgroundColor: 'transparent', border: 'none',
    color: '#3b82f6', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
  },
  userMenu: {
    display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer'
  },
  avatar: {
    width: '38px', height: '38px', borderRadius: '8px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#ffffff', fontWeight: '700', fontSize: '14px'
  },
  userInfo: { textAlign: 'right' },
  name: { fontSize: '14px', fontWeight: '500', color: '#f9fafb' },
  role: { fontSize: '11px', color: '#9ca3af', marginTop: '2px' },
  avatarImg: { width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' },
  modalOverlay: {
    position: 'fixed', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modalContent: {
    width: '100%', maxWidth: '420px', padding: '32px',
    display: 'flex', flexDirection: 'column', gap: '20px'
  },
  modalTitle: { fontSize: '18px', fontWeight: '600', color: '#f9fafb', textAlign: 'right', margin: 0 },
  avatarContainer: { display: 'flex', justifyContent: 'center', margin: '10px 0' },
  avatarEditWrapper: {
    width: '100px', height: '100px', borderRadius: '50%',
    overflow: 'hidden', position: 'relative', cursor: 'pointer',
    border: '3px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  avatarEditPreview: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarEditPlaceholder: {
    width: '100%', height: '100%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: '24px', fontWeight: '700'
  },
  avatarHoverLabel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
    fontSize: '11px', textAlign: 'center', padding: '4px 0'
  },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right' },
  label: { fontSize: '12px', color: '#9ca3af' },
  input: {
    height: '42px', padding: '0 12px', backgroundColor: '#111827',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
    color: '#f9fafb', fontSize: '13px', outline: 'none', textAlign: 'right'
  },
  modalActions: { display: 'flex', gap: '12px', marginTop: '10px' },
  saveBtn: {
    flex: 1, height: '44px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer'
  },
  cancelBtn: {
    flex: 1, height: '44px', backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
    color: '#9ca3af', fontWeight: '600', cursor: 'pointer'
  }
};

export default Topbar;
