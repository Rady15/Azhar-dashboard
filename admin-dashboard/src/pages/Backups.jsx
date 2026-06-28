import React, { useState, useEffect, useContext } from 'react';
import API from '../services/api';
import Topbar from '../components/Topbar';
import { AuthContext } from '../context/AuthContext';
import {
  Database, Download, RefreshCw, Upload, Clock, HardDrive,
  CheckCircle, AlertCircle, Shield, Trash2, Plus, AlertTriangle
} from 'lucide-react';

const Backups = () => {
  const { user } = useContext(AuthContext);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/backup/list');
      if (res.data.success) setBackups(res.data.data);
    } catch (err) {
      showToast('تعذر تحميل قائمة النسخ الاحتياطية', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBackups(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await API.post('/api/backup/create');
      showToast('✅ تم إنشاء النسخة الاحتياطية بنجاح');
      fetchBackups();
    } catch (err) {
      showToast('❌ فشل إنشاء النسخة الاحتياطية', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename) => {
    if (!window.confirm(`⚠️ سيتم استبدال جميع بيانات قاعدة البيانات الحالية ببيانات النسخة الاحتياطية:\n${filename}\n\nهل أنت متأكد؟`)) return;
    setRestoring(filename);
    try {
      await API.post('/api/backup/restore', { filename });
      showToast('✅ تمت استعادة قاعدة البيانات بنجاح');
    } catch (err) {
      showToast(err.response?.data?.message || '❌ فشلت عملية الاستعادة', 'error');
    } finally {
      setRestoring(null);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const res = await API.get(`/api/backup/download/${filename}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast('❌ فشل تحميل النسخة الاحتياطية', 'error');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('⚠️ تحذير! سيتم حذف جميع بيانات قاعدة البيانات بالكامل.\n\nلا يمكن التراجع عن هذا الإجراء.\n\nهل أنت متأكد؟')) return;
    if (!window.confirm('❗ تأكيد إضافي: أنت على وشك مسح كل شيء. اكتب "تأكيد" للمتابعة.')) return;
    setClearing(true);
    try {
      await API.post('/api/backup/clear-all');
      showToast('🗑️ تم مسح جميع بيانات قاعدة البيانات بنجاح');
      fetchBackups();
    } catch (err) {
      showToast(err.response?.data?.message || '❌ فشلت عملية المسح', 'error');
    } finally {
      setClearing(false);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div style={styles.container}>
      <Topbar title="إدارة النسخ الاحتياطية" />

      <div style={styles.content}>
        {/* Header card */}
        <div style={styles.headerCard}>
          <div style={styles.headerLeft}>
            <div style={styles.iconWrapper}>
              <Database size={28} color="#3b82f6" />
            </div>
            <div>
              <h2 style={styles.headerTitle}>النسخ الاحتياطية التلقائية</h2>
              <p style={styles.headerSub}>يتم إنشاء نسخة احتياطية تلقائياً كل 24 ساعة وعند بدء التشغيل</p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{ ...styles.createBtn, opacity: creating ? 0.7 : 1 }}
          >
            {creating ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={18} />}
            <span style={{ marginLeft: '8px' }}>{creating ? 'جاري الإنشاء...' : 'إنشاء نسخة احتياطية الآن'}</span>
          </button>
        </div>

        {/* Super admin notice */}
        {isSuperAdmin && (
          <div style={styles.superAdminNotice}>
            <Shield size={20} color="#f59e0b" />
            <span style={{ marginLeft: '10px', color: '#fcd34d', fontSize: '14px' }}>
              أنت مسجل دخول كـ <strong>Super Admin</strong> — يمكنك استعادة أي نسخة احتياطية حتى في حالة مسح قاعدة البيانات بالكامل.
            </span>
          </div>
        )}

        {/* Danger Zone */}
        {isSuperAdmin && (
          <div style={styles.dangerCard}>
            <div style={styles.dangerLeft}>
              <AlertTriangle size={24} color="#ef4444" />
              <div>
                <h4 style={styles.dangerTitle}>منطقة الخطر</h4>
                <p style={styles.dangerSub}>مسح جميع بيانات قاعدة البيانات — لا يمكن التراجع</p>
              </div>
            </div>
            <button
              onClick={handleClearAll}
              disabled={clearing}
              style={{ ...styles.clearBtn, opacity: clearing ? 0.7 : 1 }}
            >
              {clearing ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={18} />}
              <span style={{ marginLeft: '8px' }}>{clearing ? 'جاري المسح...' : 'مسح جميع البيانات'}</span>
            </button>
          </div>
        )}

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <HardDrive size={22} color="#3b82f6" />
            <div style={{ marginLeft: '12px' }}>
              <div style={styles.statValue}>{backups.length}</div>
              <div style={styles.statLabel}>نسخة احتياطية</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <Clock size={22} color="#10b981" />
            <div style={{ marginLeft: '12px' }}>
              <div style={styles.statValue}>كل 24 ساعة</div>
              <div style={styles.statLabel}>جدولة تلقائية</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <CheckCircle size={22} color="#f59e0b" />
            <div style={{ marginLeft: '12px' }}>
              <div style={styles.statValue}>{backups.reduce((s, b) => s + b.size_kb, 0).toLocaleString()} KB</div>
              <div style={styles.statLabel}>إجمالي الحجم</div>
            </div>
          </div>
        </div>

        {/* Backups list */}
        <div className="glass-panel" style={styles.listCard}>
          <h3 style={styles.listTitle}>قائمة النسخ الاحتياطية المتاحة</h3>
          {loading ? (
            <div style={styles.center}>جاري التحميل...</div>
          ) : backups.length === 0 ? (
            <div style={styles.center}>
              <Database size={48} color="#374151" style={{ marginBottom: '12px' }} />
              <p>لا توجد نسخ احتياطية بعد. اضغط على "إنشاء نسخة احتياطية الآن"</p>
            </div>
          ) : (
            <div style={styles.backupList}>
              {backups.map((b) => (
                <div key={b.filename} style={styles.backupItem}>
                  <div style={styles.backupInfo}>
                    <div style={styles.backupIcon}>
                      <Database size={20} color="#3b82f6" />
                    </div>
                    <div>
                      <div style={styles.backupName}>{b.filename}</div>
                      <div style={styles.backupMeta}>
                        <span>{new Date(b.created_at).toLocaleString('ar-SA')}</span>
                        <span style={styles.dot}>•</span>
                        <span>{b.size_kb.toLocaleString()} KB</span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.backupActions}>
                    <button
                      onClick={() => handleDownload(b.filename)}
                      style={styles.dlBtn}
                      title="تحميل"
                    >
                      <Download size={16} />
                    </button>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleRestore(b.filename)}
                        disabled={restoring === b.filename}
                        style={{ ...styles.restoreBtn, opacity: restoring === b.filename ? 0.6 : 1 }}
                        title="استعادة قاعدة البيانات"
                      >
                        {restoring === b.filename
                          ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Upload size={16} />}
                        <span style={{ marginRight: '6px' }}>
                          {restoring === b.filename ? 'يُعاد...' : 'استعادة'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="glass-panel" style={styles.infoCard}>
          <h4 style={styles.infoTitle}>📋 كيفية استعادة قاعدة البيانات بعد حذفها</h4>
          <ol style={styles.steps}>
            <li>سجّل الدخول بحساب السوبر أدمن (يعمل حتى بدون قاعدة بيانات)
              <div style={styles.cred}>البريد: <code>super@azhar-compound.sa</code> | الباسورد: <code>SuperAdmin@1234</code></div>
            </li>
            <li>انتقل إلى صفحة النسخ الاحتياطية (هذه الصفحة)</li>
            <li>اختر أحدث نسخة احتياطية واضغط على "استعادة"</li>
            <li>انتظر حتى تكتمل العملية — ستعود جميع البيانات</li>
          </ol>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'error' ? '#dc2626' : '#059669'
        }}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span style={{ marginLeft: '10px' }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { marginRight: '260px', minHeight: '100vh', backgroundColor: '#0b0f19', fontFamily: 'Zain, sans-serif' },
  content: { padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' },
  headerCard: {
    background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(29,78,216,0.08) 100%)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '16px',
    padding: '24px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  iconWrapper: {
    width: '56px', height: '56px', borderRadius: '14px',
    backgroundColor: 'rgba(59,130,246,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  headerTitle: { fontSize: '20px', fontWeight: '700', color: '#f9fafb', margin: 0, textAlign: 'right' },
  headerSub: { fontSize: '13px', color: '#9ca3af', margin: '4px 0 0', textAlign: 'right' },
  createBtn: {
    height: '46px', padding: '0 24px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    border: 'none', borderRadius: '10px', color: '#fff',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '8px'
  },
  superAdminNotice: {
    display: 'flex', alignItems: 'center', padding: '14px 20px',
    backgroundColor: 'rgba(245,158,11,0.08)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: '12px'
  },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' },
  statCard: {
    padding: '20px', borderRadius: '12px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', alignItems: 'center'
  },
  statValue: { fontSize: '20px', fontWeight: '700', color: '#f9fafb', textAlign: 'right' },
  statLabel: { fontSize: '12px', color: '#9ca3af', textAlign: 'right', marginTop: '2px' },
  listCard: { borderRadius: '16px', padding: '24px' },
  listTitle: { fontSize: '16px', fontWeight: '600', color: '#f9fafb', textAlign: 'right', margin: '0 0 20px' },
  center: { padding: '40px', textAlign: 'center', color: '#9ca3af' },
  backupList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  backupItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    flexWrap: 'wrap', gap: '12px'
  },
  backupInfo: { display: 'flex', alignItems: 'center', gap: '14px' },
  backupIcon: {
    width: '42px', height: '42px', borderRadius: '10px',
    backgroundColor: 'rgba(59,130,246,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  backupName: { fontSize: '13px', fontWeight: '600', color: '#e5e7eb', textAlign: 'right' },
  backupMeta: { fontSize: '12px', color: '#6b7280', textAlign: 'right', marginTop: '3px', display: 'flex', gap: '8px' },
  dot: { color: '#374151' },
  backupActions: { display: 'flex', gap: '10px', alignItems: 'center' },
  dlBtn: {
    width: '36px', height: '36px', borderRadius: '8px', border: 'none',
    backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  restoreBtn: {
    height: '36px', padding: '0 14px', borderRadius: '8px', border: 'none',
    backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b',
    cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: '600'
  },
  infoCard: { borderRadius: '16px', padding: '24px' },
  infoTitle: { fontSize: '15px', fontWeight: '600', color: '#f9fafb', textAlign: 'right', margin: '0 0 16px' },
  steps: {
    color: '#9ca3af', fontSize: '14px', direction: 'rtl',
    textAlign: 'right', paddingRight: '20px', lineHeight: '2', margin: 0
  },
  cred: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '6px',
    padding: '6px 12px', marginTop: '6px', fontSize: '12px',
    color: '#e5e7eb', display: 'inline-block'
  },
  // Danger Zone
  dangerCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px', borderRadius: '16px',
    backgroundColor: 'rgba(239,68,68,0.06)',
    border: '1px solid rgba(239,68,68,0.15)',
    flexWrap: 'wrap', gap: '16px'
  },
  dangerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  dangerTitle: { fontSize: '16px', fontWeight: '700', color: '#ef4444', margin: 0, textAlign: 'right' },
  dangerSub: { fontSize: '13px', color: '#fca5a5', margin: '4px 0 0', textAlign: 'right' },
  clearBtn: {
    height: '46px', padding: '0 24px',
    background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    border: 'none', borderRadius: '10px', color: '#fff',
    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
    display: 'flex', alignItems: 'center'
  },
  toast: {
    position: 'fixed', bottom: '24px', left: '50%',
    transform: 'translateX(-50%)',
    color: '#fff', padding: '12px 24px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', gap: '10px',
    fontSize: '14px', fontWeight: '500', zIndex: 9999,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
  }
};

export default Backups;
