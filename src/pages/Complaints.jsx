import React, { useState, useEffect } from 'react';
import API from '../services/api';
import Topbar from '../components/Topbar';
import { MessageSquare, ShieldOff, CheckCircle, Send, LayoutGrid, List } from 'lucide-react';

const Complaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'card'

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/complaints');
      if (res.data.success) {
        setComplaints(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSelectComplaint = async (c) => {
    try {
      const res = await API.get(`/api/complaints/${c.id}`);
      if (res.data.success) {
        setSelectedComplaint(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    try {
      const res = await API.post(`/api/complaints/${selectedComplaint.id}/reply`, {
        message: replyMessage,
        is_internal: false
      });
      if (res.data.success) {
        setReplyMessage('');
        // Reload details
        handleSelectComplaint(selectedComplaint);
      }
    } catch (err) {
      alert('تعذر إرسال الرد.');
    }
  };

  const handleResolve = async (id) => {
    try {
      const res = await API.put(`/api/complaints/${id}/resolve`);
      if (res.data.success) {
        if (selectedComplaint && selectedComplaint.id === id) {
          setSelectedComplaint({ ...selectedComplaint, status: 'resolved' });
        }
        fetchComplaints();
      }
    } catch (err) {
      alert('تعذر إغلاق الشكوى.');
    }
  };

  const getStatusText = (status) => {
    const s = {
      open: 'مفتوحة',
      in_review: 'قيد المراجعة',
      resolved: 'تم الحل',
      closed: 'مغلقة'
    };
    return s[status] || status;
  };

  return (
    <div style={styles.container}>
      <Topbar title="مركز الشكاوى" />

      <div style={styles.content}>
        <div style={styles.layoutGrid}>
          {/* Detailed Conversation Thread */}
          <div className="glass-panel" style={styles.chatCard}>
            {selectedComplaint ? (
              <div style={styles.chatContainer}>
                <div style={styles.chatHeader}>
                  <div style={styles.headerInfo}>
                    <h4>{selectedComplaint.subject}</h4>
                    <span style={styles.ticketNo}>{selectedComplaint.ticket_number}</span>
                  </div>
                  {selectedComplaint.status !== 'resolved' && (
                    <button 
                      onClick={() => handleResolve(selectedComplaint.id)} 
                      style={styles.resolveBtn}
                    >
                      <CheckCircle size={16} style={{ marginLeft: '6px' }} />
                      <span>تحديد كمحلولة</span>
                    </button>
                  )}
                </div>

                <div style={styles.conversation}>
                  {/* Originating Ticket Body */}
                  <div style={styles.originMessage}>
                    <p style={styles.meta}>
                      {selectedComplaint.is_anonymous ? 'هوية مخفية' : selectedComplaint.tenant_name} •{' '}
                      {new Date(selectedComplaint.created_at).toLocaleString('ar-SA')}
                    </p>
                    <p style={styles.bodyText}>{selectedComplaint.description}</p>
                  </div>

                  {/* Replies thread */}
                  {selectedComplaint.replies?.map((reply, i) => (
                    <div 
                      key={i} 
                      style={{
                        ...styles.replyMessage,
                        alignSelf: reply.sender_role === 'tenant' ? 'flex-start' : 'flex-end',
                        backgroundColor: reply.sender_role === 'tenant' ? 'rgba(255,255,255,0.03)' : 'rgba(59, 130, 246, 0.1)'
                      }}
                    >
                      <p style={styles.replyMeta}>
                        {reply.sender_role === 'tenant' ? 'المستأجر' : 'الإدارة'} •{' '}
                        {new Date(reply.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p style={styles.replyText}>{reply.message}</p>
                    </div>
                  ))}
                </div>

                {selectedComplaint.status !== 'resolved' && (
                  <form onSubmit={handleSendReply} style={styles.replyForm}>
                    <input
                      type="text"
                      placeholder="اكتب ردك هنا..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      style={styles.replyInput}
                    />
                    <button type="submit" style={styles.sendBtn}>
                      <Send size={18} />
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div style={styles.noSelection}>حدد شكوى من القائمة الجانبية لبدء المحادثة ومراجعة التفاصيل.</div>
            )}
          </div>

          {/* Sidebar Complaint List */}
          <div className="glass-panel" style={styles.listCard}>
            <div style={styles.listHeader}>
              <h3 style={styles.sidebarTitle}>قائمة الشكاوى الواردة</h3>
              <div style={styles.viewToggle}>
                <button onClick={() => setViewMode('list')} style={{ ...styles.toggleBtn, ...(viewMode === 'list' ? styles.toggleActive : {}) }} title="قائمة">
                  <List size={15} />
                </button>
                <button onClick={() => setViewMode('card')} style={{ ...styles.toggleBtn, ...(viewMode === 'card' ? styles.toggleActive : {}) }} title="بطاقات">
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>
            {loading ? (
              <div style={styles.center}>جاري التحميل...</div>
            ) : viewMode === 'card' ? (
              <div style={styles.cardGrid}>
                {complaints.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { handleSelectComplaint(c); setViewMode('list'); }}
                    style={{
                      ...styles.complaintCard,
                      borderColor: selectedComplaint?.id === c.id ? '#3b82f6' : 'rgba(255,255,255,0.06)'
                    }}
                  >
                    <div style={styles.cardTop}>
                      <div style={{
                        ...styles.cardStatusDot,
                        backgroundColor: c.status === 'resolved' ? '#10b981'
                          : c.status === 'in_review' ? '#3b82f6'
                          : c.status === 'closed' ? '#6b7280' : '#f59e0b'
                      }} />
                      <span style={{ ...styles.cardStatusText, color: c.status === 'resolved' ? '#10b981' : c.status === 'in_review' ? '#3b82f6' : c.status === 'closed' ? '#6b7280' : '#f59e0b' }}>
                        {getStatusText(c.status)}
                      </span>
                    </div>
                    <div style={styles.cardSubject}>{c.subject}</div>
                    <div style={styles.cardMeta}>
                      <span>
                        {c.is_anonymous ? (
                          <span style={styles.anonSpan}><ShieldOff size={11} style={{ marginLeft: '3px' }} />مجهول</span>
                        ) : c.tenant_name || '—'}
                      </span>
                      <span>{new Date(c.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                    {c.tenant_avatar_url && (
                      <img src={c.tenant_avatar_url} alt="" style={styles.cardAvatar} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.list}>
                {complaints.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectComplaint(c)}
                    style={{
                      ...styles.listItem,
                      backgroundColor: selectedComplaint?.id === c.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent'
                    }}
                  >
                    <div style={styles.listRow}>
                      <strong>{c.subject}</strong>
                      <span style={{
                        ...styles.statusBadge,
                        color: c.status === 'resolved' ? '#10b981' : '#f59e0b'
                      }}>
                        {getStatusText(c.status)}
                      </span>
                    </div>
                    <div style={styles.listRowMeta}>
                      <span style={styles.listMetaText}>
                        {c.is_anonymous ? (
                          <span style={styles.anonSpan}>
                            <ShieldOff size={12} style={{ marginLeft: '4px' }} />
                            مجهول
                          </span>
                        ) : c.tenant_name}
                      </span>
                      <span style={styles.listMetaText}>{new Date(c.created_at).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
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
    padding: '32px'
  },
  center: {
    padding: '40px',
    textAlign: 'center',
    color: '#9ca3af'
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
    height: 'calc(100vh - 140px)'
  },
  listCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '100%',
    overflowY: 'auto'
  },
  sidebarTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#f9fafb',
    textAlign: 'right'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  listItem: {
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.03)',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    textAlign: 'right'
  },
  listRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    direction: 'rtl'
  },
  listRowMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11px',
    color: '#6b7280',
    direction: 'rtl'
  },
  listMetaText: {
    display: 'flex',
    alignItems: 'center'
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: '500'
  },
  anonSpan: {
    display: 'flex',
    alignItems: 'center',
    color: '#f87171'
  },
  chatCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  chatContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  },
  chatHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    direction: 'rtl'
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    textAlign: 'right'
  },
  ticketNo: {
    fontSize: '11px',
    color: '#6b7280'
  },
  resolveBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 14px',
    borderRadius: '8px',
    backgroundColor: '#10b98120',
    border: 'none',
    color: '#10b981',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  conversation: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  originMessage: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'right',
    maxWidth: '85%',
    alignSelf: 'flex-start'
  },
  meta: {
    fontSize: '11px',
    color: '#6b7280',
    marginBottom: '8px'
  },
  bodyText: {
    fontSize: '14px',
    color: '#d1d5db',
    lineHeight: '1.5'
  },
  replyMessage: {
    borderRadius: '12px',
    padding: '14px 16px',
    maxWidth: '80%',
    textAlign: 'right'
  },
  replyMeta: {
    fontSize: '10px',
    color: '#6b7280',
    marginBottom: '4px'
  },
  replyText: {
    fontSize: '13.5px',
    color: '#e5e7eb',
    lineHeight: '1.4'
  },
  replyForm: {
    padding: '20px 24px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  replyInput: {
    flex: 1,
    height: '42px',
    backgroundColor: '#111827',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '0 16px',
    color: '#f9fafb',
    fontSize: '13px',
    outline: 'none',
    textAlign: 'right'
  },
  sendBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  noSelection: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    fontSize: '14px',
    padding: '40px',
    textAlign: 'center'
  },
  // View toggle styles
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl' },
  viewToggle: { display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px' },
  toggleBtn: {
    width: '30px', height: '30px', borderRadius: '6px', border: 'none',
    backgroundColor: 'transparent', color: '#9ca3af', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
  },
  toggleActive: { backgroundColor: '#3b82f6', color: '#fff' },
  // Card view styles
  cardGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '8px' },
  complaintCard: {
    padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'pointer',
    transition: 'all 0.2s', direction: 'rtl', textAlign: 'right'
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' },
  cardStatusDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  cardStatusText: { fontSize: '11px', fontWeight: '600' },
  cardSubject: { fontSize: '13px', fontWeight: '600', color: '#e5e7eb', marginBottom: '8px', lineHeight: '1.4' },
  cardMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' },
  cardAvatar: { width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginTop: '8px', float: 'right' }
};

export default Complaints;

