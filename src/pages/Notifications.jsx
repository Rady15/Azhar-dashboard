import React, { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import Topbar from '../components/Topbar';
import {
  Bell, Megaphone, CreditCard, AlertTriangle, Info,
  Wrench, MessageSquare, CheckCheck, Trash2, Send,
  Filter, X, ChevronLeft, ChevronRight, Loader
} from 'lucide-react';

const TYPE_CONFIG = {
  all:                { label: 'الكل',          icon: Bell,           color: '#9ca3af' },
  payment_received:   { label: 'دفعة مستلمة',   icon: CreditCard,     color: '#10b981' },
  payment_due:        { label: 'استحقاق دفع',   icon: CreditCard,     color: '#f59e0b' },
  announcement:       { label: 'إعلان',         icon: Megaphone,      color: '#3b82f6' },
  emergency:          { label: 'طوارئ',         icon: AlertTriangle,  color: '#ef4444' },
  maintenance_update: { label: 'صيانة',         icon: Wrench,         color: '#f59e0b' },
  complaint_reply:    { label: 'شكوى',          icon: MessageSquare,  color: '#8b5cf6' },
  system:             { label: 'النظام',        icon: Info,           color: '#6b7280' }
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 });
  const [filterType, setFilterType] = useState('all');

  // Broadcast modal
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadTitle, setBroadTitle] = useState('');
  const [broadBody, setBroadBody] = useState('');
  const [broadType, setBroadType] = useState('announcement');
  const [sending, setSending] = useState(false);

  const fetchAll = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      if (filterType !== 'all') params.type = filterType;
      const res = await API.get('/api/notifications/my', { params: { ...params, compound: true } });
      if (res.data.success) {
        setNotifications(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'فشل تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadTitle.trim() || !broadBody.trim()) return;
    setSending(true);
    try {
      const res = await API.post('/api/notifications/broadcast', {
        title: broadTitle, body: broadBody, type: broadType
      });
      if (res.data.success) {
        setShowBroadcast(false);
        setBroadTitle('');
        setBroadBody('');
        setBroadType('announcement');
        fetchAll(1);
      }
    } catch (_) {
      alert('فشل إرسال البث. حاول مرة أخرى.');
    } finally {
      setSending(false);
    }
  };

  const markAllRead = async () => {
    try {
      await API.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (_) {}
  };

  const removeNotif = async (id) => {
    try {
      await API.delete(`/api/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (_) {}
  };

  const clearAll = async () => {
    if (!window.confirm('هل أنت متأكد من حذف جميع الإشعارات؟')) return;
    try {
      await Promise.all(notifications.map(n => API.delete(`/api/notifications/${n.id}`)));
      setNotifications([]);
      setPagination(prev => ({ ...prev, total: 0 }));
    } catch (_) {}
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

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div style={styles.container}>
      <Topbar title="مركز الإشعارات" />

      <div style={styles.content}>
        {/* Header Actions */}
        <div style={styles.headerRow}>
          <div style={styles.headerLeft}>
            <div style={styles.filterGroup}>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const active = filterType === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterType(key)}
                    style={{
                      ...styles.filterBtn,
                      backgroundColor: active ? `${cfg.color}15` : 'transparent',
                      color: active ? cfg.color : '#9ca3af',
                      borderColor: active ? cfg.color : 'rgba(255,255,255,0.05)'
                    }}
                  >
                    <Icon size={14} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={styles.headerRight}>
            <button onClick={markAllRead} style={styles.actionBtn}>
              <CheckCheck size={16} /> تحديد الكل مقروء
            </button>
            <button onClick={clearAll} style={{ ...styles.actionBtn, color: '#ef4444' }}>
              <Trash2 size={16} /> حذف الكل
            </button>
            <button onClick={() => setShowBroadcast(true)} style={styles.broadcastBtn}>
              <Send size={16} /> بث إشعار
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="glass-panel" style={styles.listCard}>
          {loading ? (
            <div style={styles.centerState}>
              <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span>جاري تحميل الإشعارات...</span>
            </div>
          ) : error ? (
            <div style={{ ...styles.centerState, color: '#ef4444' }}>
              <AlertTriangle size={40} style={{ marginBottom: '12px' }} />
              <span>{error}</span>
            </div>
          ) : notifications.length === 0 ? (
            <div style={styles.centerState}>
              <Bell size={40} style={{ color: '#4b5563', marginBottom: '12px' }} />
              <span style={{ color: '#6b7280' }}>لا توجد إشعارات</span>
            </div>
          ) : (
            <>
              {notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.all;
                const Icon = cfg.icon;
                return (
                  <div key={n.id} style={styles.notifItem}>
                    <div style={{ ...styles.notifIcon, backgroundColor: `${cfg.color}15`, color: cfg.color }}>
                      <Icon size={16} />
                    </div>
                    <div style={styles.notifBody}>
                      <div style={styles.notifHeader}>
                        <span style={{ ...styles.notifType, color: cfg.color }}>{cfg.label}</span>
                        <span style={styles.notifTime}>{timeAgo(n.created_at)}</span>
                      </div>
                      <div style={styles.notifTitle}>{n.title}</div>
                      {n.body && <div style={styles.notifText}>{n.body}</div>}
                      <div style={styles.notifMeta}>
                        <span style={styles.metaItem}>
                          {n.is_read ? (
                            <span style={{ color: '#10b981' }}>مقروء</span>
                          ) : (
                            <span style={{ color: '#f59e0b' }}>غير مقروء</span>
                          )}
                        </span>
                        {n.user_id && <span style={styles.metaItem}>المستخدم #{n.user_id}</span>}
                      </div>
                    </div>
                    <div className="notif-actions" style={styles.notifActions}>
                      {!n.is_read && (
                        <button onClick={() => {
                          API.put(`/api/notifications/${n.id}/read`);
                          setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                        }} style={styles.smallBtn} title="تحديد كمقروء">
                          <CheckCheck size={14} />
                        </button>
                      )}
                      <button onClick={() => removeNotif(n.id)} style={{ ...styles.smallBtn, color: '#ef4444' }} title="حذف">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={styles.pagination}>
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchAll(pagination.page - 1)}
                    style={{ ...styles.pageBtn, opacity: pagination.page <= 1 ? 0.3 : 1 }}
                  >
                    <ChevronRight size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => fetchAll(p)}
                      style={{
                        ...styles.pageNum,
                        backgroundColor: p === pagination.page ? '#3b82f6' : 'transparent',
                        color: p === pagination.page ? '#ffffff' : '#9ca3af'
                      }}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    disabled={pagination.page >= totalPages}
                    onClick={() => fetchAll(pagination.page + 1)}
                    style={{ ...styles.pageBtn, opacity: pagination.page >= totalPages ? 0.3 : 1 }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>بث إشعار لجميع المستأجرين</h3>
              <button onClick={() => setShowBroadcast(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBroadcast} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>نوع الإشعار</label>
                <select value={broadType} onChange={(e) => setBroadType(e.target.value)} style={styles.input}>
                  <option value="announcement">إعلان عام</option>
                  <option value="emergency">طوارئ</option>
                  <option value="payment_due">تذكير دفع</option>
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>العنوان</label>
                <input
                  type="text" value={broadTitle}
                  onChange={(e) => setBroadTitle(e.target.value)}
                  placeholder="عنوان الإشعار"
                  style={styles.input} required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>النص</label>
                <textarea
                  value={broadBody}
                  onChange={(e) => setBroadBody(e.target.value)}
                  placeholder="محتوى الإشعار..."
                  style={{ ...styles.input, height: '100px', resize: 'vertical', paddingTop: '12px' }}
                  required
                />
              </div>
              <div style={styles.modalActions}>
                <button type="submit" disabled={sending} style={styles.sendBtn}>
                  {sending ? 'جاري الإرسال...' : 'إرسال البث'}
                </button>
                <button type="button" onClick={() => setShowBroadcast(false)} style={styles.cancelBtn}>
                  إلغاء
                </button>
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
    marginRight: '260px', minHeight: '100vh',
    backgroundColor: '#0b0f19', fontFamily: 'Zain, sans-serif'
  },
  content: { padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' },
  headerRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '16px'
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  filterGroup: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  filterBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 12px', borderRadius: '8px', border: '1px solid',
    fontSize: '12px', fontWeight: '500', cursor: 'pointer',
    transition: 'all 0.15s'
  },
  headerRight: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  actionBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
    backgroundColor: 'transparent', color: '#9ca3af',
    fontSize: '12px', fontWeight: '500', cursor: 'pointer'
  },
  broadcastBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', borderRadius: '8px', border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: '#ffffff', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
  },
  listCard: {
    padding: '0', display: 'flex', flexDirection: 'column',
    minHeight: '300px'
  },
  centerState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '8px', padding: '60px 20px',
    color: '#9ca3af', fontSize: '14px'
  },
  notifItem: {
    display: 'flex', alignItems: 'flex-start', gap: '16px',
    padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.03)',
    direction: 'rtl', transition: 'background 0.15s'
  },
  notifIcon: {
    width: '40px', height: '40px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0
  },
  notifBody: { flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' },
  notifHeader: {
    display: 'flex', alignItems: 'center', gap: '12px'
  },
  notifType: { fontSize: '11px', fontWeight: '600' },
  notifTime: { fontSize: '11px', color: '#6b7280' },
  notifTitle: { fontSize: '14px', fontWeight: '500', color: '#f9fafb' },
  notifText: { fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' },
  notifMeta: {
    display: 'flex', gap: '16px', marginTop: '4px'
  },
  metaItem: { fontSize: '11px', color: '#6b7280' },
  notifActions: {
    display: 'flex', gap: '6px', flexShrink: 0, opacity: 0.3,
    transition: 'opacity 0.15s'
  },
  smallBtn: {
    width: '30px', height: '30px', borderRadius: '6px',
    border: 'none', backgroundColor: 'rgba(255,255,255,0.03)',
    color: '#9ca3af', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center'
  },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', padding: '20px'
  },
  pageBtn: {
    padding: '8px', borderRadius: '6px', border: 'none',
    backgroundColor: 'transparent', color: '#9ca3af',
    cursor: 'pointer', display: 'flex'
  },
  pageNum: {
    width: '32px', height: '32px', borderRadius: '6px',
    border: 'none', fontSize: '13px', fontWeight: '500',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200
  },
  modal: {
    width: '100%', maxWidth: '480px', padding: '32px',
    display: 'flex', flexDirection: 'column', gap: '24px'
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  modalTitle: { fontSize: '18px', fontWeight: '600', color: '#f9fafb' },
  closeBtn: {
    backgroundColor: 'transparent', border: 'none',
    color: '#9ca3af', cursor: 'pointer'
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' },
  label: { fontSize: '12px', color: '#9ca3af' },
  input: {
    height: '42px', padding: '0 12px', backgroundColor: '#111827',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
    color: '#f9fafb', fontSize: '13px', outline: 'none', textAlign: 'right'
  },
  modalActions: { display: 'flex', gap: '12px', marginTop: '8px' },
  sendBtn: {
    flex: 1, height: '44px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    border: 'none', borderRadius: '8px', color: '#ffffff',
    fontWeight: '600', cursor: 'pointer'
  },
  cancelBtn: {
    flex: 1, height: '44px', backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
    color: '#9ca3af', fontWeight: '600', cursor: 'pointer'
  }
};

export default Notifications;
