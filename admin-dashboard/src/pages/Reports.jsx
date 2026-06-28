import React, { useState, useEffect } from 'react';
import API from '../services/api';
import Topbar from '../components/Topbar';
import { DollarSign, Clock, CheckCircle, BarChart3 } from 'lucide-react';

const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [finRes, mntRes] = await Promise.all([
          API.get('/api/reports/financial'),
          API.get('/api/reports/maintenance')
        ]);
        if (finRes.data.success && mntRes.data.success) {
          setData({
            financial: finRes.data.data,
            maintenance: mntRes.data.data
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div style={styles.center}>جاري تحميل التقارير الإحصائية...</div>;

  const mnt = data?.maintenance;
  const fin = data?.financial;

  return (
    <div style={styles.container}>
      <Topbar title="التقارير والتحليلات" />

      <div style={styles.content}>
        {/* Core KPIs Row */}
        <div style={styles.grid}>
          <div className="glass-panel" style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ ...styles.cardIcon, color: '#f59e0b', backgroundColor: '#f59e0b15' }}>
                <Clock size={20} />
              </div>
              <span style={styles.cardName}>متوسط وقت الحل</span>
            </div>
            <div style={styles.cardValue}>{mnt?.resolution_times?.avg_hours || '—'} ساعة</div>
          </div>

          <div className="glass-panel" style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ ...styles.cardIcon, color: '#10b981', backgroundColor: '#10b98115' }}>
                <CheckCircle size={20} />
              </div>
              <span style={styles.cardName}>أسرع حل مسجل</span>
            </div>
            <div style={styles.cardValue}>{mnt?.resolution_times?.min_hours || '—'} ساعة</div>
          </div>
        </div>

        {/* Maintenance Categories Table */}
        <div className="glass-panel" style={{ ...styles.card, marginTop: '24px' }}>
          <h3 style={styles.sectionTitle}>تصنيف طلبات الصيانة وإنجازها</h3>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>التصنيف</th>
                <th style={styles.th}>عدد الطلبات الإجمالي</th>
                <th style={styles.th}>المكتملة</th>
                <th style={styles.th}>نسبة الإنجاز</th>
              </tr>
            </thead>
            <tbody>
              {mnt?.by_category?.map((cat, idx) => {
                const percent = cat.count > 0 ? Math.round((cat.completed / cat.count) * 100) : 0;
                return (
                  <tr key={idx} style={styles.trRow}>
                    <td style={styles.td}><strong>{cat.category === 'plumbing' ? 'سباكة' : cat.category === 'electrical' ? 'كهرباء' : cat.category === 'ac_hvac' ? 'تكييف' : cat.category}</strong></td>
                    <td style={styles.td}>{cat.count}</td>
                    <td style={styles.td}>{cat.completed}</td>
                    <td style={styles.td}>
                      <div style={styles.progressContainer}>
                        <div style={{ ...styles.progressBar, width: `${percent}%` }} />
                        <span style={styles.progressText}>{percent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px'
  },
  card: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    direction: 'rtl'
  },
  cardIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardName: {
    fontSize: '13px',
    color: '#9ca3af'
  },
  cardValue: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#f9fafb',
    textAlign: 'right'
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#f9fafb',
    textAlign: 'right',
    marginBottom: '16px'
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
    padding: '12px 16px',
    color: '#9ca3af',
    fontSize: '13px',
    fontWeight: '500'
  },
  trRow: {
    borderBottom: '1px solid rgba(255,255,255,0.03)'
  },
  td: {
    padding: '14px 16px',
    color: '#e5e7eb',
    fontSize: '13.5px'
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '140px'
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#3b82f6',
    borderRadius: '3px'
  },
  progressText: {
    fontSize: '11px',
    color: '#9ca3af'
  }
};

export default Reports;
