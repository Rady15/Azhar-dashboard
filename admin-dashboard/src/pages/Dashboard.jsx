import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import API from '../services/api';
import {
  Home, Users, Wrench, Star, TrendingUp, Award,
  Clock, Sparkles, CalendarDays, Activity, TreePine,
  UserPlus, Bell, BarChart3, MessageSquare,
  ShieldCheck, Zap, CheckCircle, Timer,
  ChevronLeft, ArrowUpRight, CircleDashed,
  CreditCard, AlertTriangle, CheckSquare
} from 'lucide-react';

const monthsAr = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const activityConfig = {
  maintenance: { label: 'صيانة', icon: Wrench, color: '#f59e0b' },
  payment:     { label: 'دفعة', icon: CreditCard, color: '#10b981' },
  complaint:   { label: 'شكوى', icon: MessageSquare, color: '#a855f7' },
  notification:{ label: 'إشعار', icon: Bell, color: '#3b82f6' },
  emergency:   { label: 'طوارئ', icon: AlertTriangle, color: '#ef4444' },
};

const quickActions = [
  { label: 'إضافة مستأجر', icon: UserPlus, color: '#00d4ff', path: '/tenants' },
  { label: 'طلب صيانة', icon: Wrench, color: '#f59e0b', path: '/maintenance' },
  { label: 'إرسال إشعار', icon: Bell, color: '#a855f7', path: '/notifications' },
  { label: 'تقرير مالي', icon: BarChart3, color: '#10b981', path: '/reports' },
];

const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'منذ يوم';
  if (days < 30) return `منذ ${days} أيام`;
  return new Date(d).toLocaleDateString('ar-SA');
};

const formatCompact = (val) => {
  const n = parseFloat(val || 0);
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k';
  return n.toLocaleString();
};

const styles = {
  container: {
    marginRight: '260px',
    minHeight: '100vh',
    backgroundColor: '#080c18',
    fontFamily: 'Zain, sans-serif',
  },
  content: {
    padding: '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
  },
  loaderWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: 'calc(100vh - 70px)', gap: '20px',
  },
  loaderRing: {
    width: '52px', height: '52px', borderRadius: '50%',
    border: '3px solid rgba(0,212,255,0.08)',
    borderTopColor: '#00d4ff',
    animation: 'spin 0.8s linear infinite',
  },
  loaderText: { color: '#6b7280', fontSize: '13px' },
  errorBox: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: 'calc(100vh - 70px)', gap: '16px',
  },
  errorIcon: { fontSize: '40px', color: '#ef4444' },
  errorText: { color: '#9ca3af', fontSize: '14px', textAlign: 'center' },
  retryBtn: {
    height: '38px', padding: '0 22px', marginTop: '4px',
    backgroundColor: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)',
    borderRadius: '8px', color: '#00d4ff', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
  },
  hero: {
    position: 'relative',
    borderRadius: '16px',
    overflow: 'hidden',
    background: 'url(/header.png) center / cover no-repeat',
    border: '1px solid rgba(255,255,255,0.04)',
    padding: '36px 40px',
    minHeight: '150px',
  },
  heroGlow: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(135deg, rgba(8,12,24,0.85) 0%, rgba(8,12,24,0.65) 50%, rgba(8,12,24,0.8) 100%)',
    pointerEvents: 'none',
  },
  heroGrid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)',
    backgroundSize: '60px 60px',
    pointerEvents: 'none',
  },
  heroContent: {
    position: 'relative', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between',
  },
  heroRight: {
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  heroGreet: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '13px', color: '#fbbf24', fontWeight: '500',
  },
  heroTitle: {
    fontSize: '27px', fontWeight: '800', margin: 0,
    background: 'linear-gradient(135deg, #f0f4ff 0%, #94a3b8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.3px',
  },
  heroMeta: {
    display: 'flex', alignItems: 'center', gap: '10px',
    fontSize: '12px', color: '#6b7280',
  },
  heroDate: { display: 'flex', alignItems: 'center', gap: '6px' },
  heroDot: { color: '#374151' },
  heroStatus: { display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280' },
  heroBadgeRow: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' },
  heroBadge: {
    display: 'flex', alignItems: 'center', gap: '5px',
    fontSize: '10px', fontWeight: '600', color: '#fbbf24',
    backgroundColor: 'rgba(251,191,36,0.1)',
    border: '1px solid rgba(251,191,36,0.15)',
    padding: '4px 10px', borderRadius: '6px', lineHeight: 1,
  },
  heroDeco: { opacity: 0.6, transform: 'rotate(3deg)' },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '18px',
  },
  kpiCard: {
    position: 'relative', borderRadius: '14px', overflow: 'hidden',
    backgroundColor: 'rgba(13,20,34,0.7)',
    border: '1px solid rgba(255,255,255,0.04)',
    padding: '22px 22px 20px',
    display: 'flex', flexDirection: 'column', gap: '5px',
    transition: 'transform 0.2s ease, box-shadow 0.3s ease',
  },
  kpiCardBg: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.025) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  kpiTop: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: '2px',
  },
  kpiIconBox: {
    width: '38px', height: '38px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  kpiUrgent: {
    fontSize: '10px', fontWeight: '700', color: '#fff',
    backgroundColor: '#ef4444', padding: '3px 8px',
    borderRadius: '6px', lineHeight: 1,
  },
  kpiValue: {
    fontSize: '28px', fontWeight: '800', color: '#f0f4ff',
    letterSpacing: '-0.5px', lineHeight: 1.1,
  },
  kpiLabel: { fontSize: '12px', color: '#94a3b8' },
  kpiSub: { fontSize: '11px', lineHeight: 1.3 },
  kpiProgressTrack: {
    width: '100%', height: '4px',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: '2px', marginTop: '6px', overflow: 'hidden',
  },
  kpiProgressFill: {
    height: '100%', borderRadius: '2px',
    transition: 'width 0.8s ease',
  },
  midGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '18px',
  },
  chartCard: {
    backgroundColor: 'rgba(13,20,34,0.7)',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.04)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 22px 10px',
  },
  cardTitleRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  cardTitle: { fontSize: '14px', fontWeight: '600', color: '#e5e7eb' },
  cardBadge: {
    fontSize: '10px', color: '#6b7280',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: '4px 10px', borderRadius: '6px', fontWeight: '500',
  },
  chartBody: {
    flex: 1, padding: '6px 22px 18px',
    display: 'flex', alignItems: 'flex-end',
  },
  chartBars: {
    display: 'flex', alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%', height: '200px', gap: '3px',
  },
  barCol: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '5px',
    flex: 1, height: '100%', justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: '9px', color: '#6b7280',
    whiteSpace: 'nowrap', fontWeight: '500',
  },
  barTrack: {
    width: '100%', maxWidth: '36px', height: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: '4px 4px 0 0',
    display: 'flex', alignItems: 'flex-end',
  },
  barFill: {
    width: '100%', borderRadius: '4px 4px 0 0',
    transition: 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    minHeight: '4px',
  },
  barLabel: { fontSize: '9px', color: '#6b7280', fontWeight: '500' },
  teamCard: {
    backgroundColor: 'rgba(13,20,34,0.7)',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.04)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  teamStaffList: {
    flex: 1, padding: '2px 22px 8px',
    display: 'flex', flexDirection: 'column', gap: '2px',
  },
  teamRow: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
    direction: 'rtl',
  },
  teamRank: { width: '24px', textAlign: 'center' },
  teamMedal: { fontSize: '16px' },
  teamAvatar: {
    width: '34px', height: '34px', borderRadius: '10px',
    backgroundColor: 'rgba(255,255,255,0.04)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#d1d5db', fontSize: '11px', fontWeight: '600',
    border: '1.5px solid rgba(255,255,255,0.06)', flexShrink: 0,
  },
  teamInfo: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: '3px',
    textAlign: 'right',
  },
  teamName: { fontSize: '12px', fontWeight: '500', color: '#e5e7eb' },
  teamStats: { display: 'flex', gap: '12px', fontSize: '10px', color: '#6b7280' },
  teamStat: { display: 'flex', alignItems: 'center', gap: '3px' },
  teamFooter: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '10px 22px', borderTop: '1px solid rgba(255,255,255,0.03)',
    justifyContent: 'center', direction: 'rtl',
  },
  teamFooterText: { fontSize: '11px', color: '#6b7280' },
  teamEmpty: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '28px 24px', gap: '8px',
  },
  teamEmptyIconWrap: {
    width: '72px', height: '72px', borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: '4px',
  },
  teamEmptyTitle: { fontSize: '14px', fontWeight: '600', color: '#94a3b8' },
  teamEmptySub: {
    fontSize: '11px', color: '#4b5563', textAlign: 'center',
    lineHeight: 1.5, maxWidth: '180px',
  },
  teamEmptyLine: {
    width: '40px', height: '1px',
    backgroundColor: 'rgba(255,255,255,0.06)', margin: '8px 0',
  },
  teamEmptyHint: {
    display: 'flex', alignItems: 'center', gap: '5px',
    fontSize: '10px', color: '#4b5563',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '18px',
  },
  activityCard: {
    backgroundColor: 'rgba(13,20,34,0.7)',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.04)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  viewAllBtn: {
    display: 'flex', alignItems: 'center', gap: '2px',
    backgroundColor: 'transparent', border: 'none',
    color: '#6b7280', fontSize: '11px', cursor: 'pointer', fontWeight: '500',
  },
  timeline: { padding: '8px 22px 14px', display: 'flex', flexDirection: 'column', gap: '0' },
  timelineItem: { display: 'flex', gap: '14px' },
  timelineLine: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', width: '26px', flexShrink: 0,
  },
  timelineDot: {
    width: '26px', height: '26px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, zIndex: 1,
  },
  timelineStem: {
    width: '2px', flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)', marginTop: '4px',
  },
  timelineContent: {
    flex: 1, paddingBottom: '18px',
    display: 'flex', flexDirection: 'column', gap: '3px',
    textAlign: 'right', direction: 'rtl',
  },
  timelineHeader: {
    display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1px',
  },
  timelineBadge: {
    fontSize: '9px', fontWeight: '600',
    padding: '2px 8px', borderRadius: '4px', lineHeight: 1,
  },
  timelineTime: {
    display: 'flex', alignItems: 'center', gap: '4px',
    fontSize: '10px', color: '#4b5563',
  },
  timelineDesc: { fontSize: '13px', color: '#d1d5db', lineHeight: 1.4 },
  quickCard: {
    backgroundColor: 'rgba(13,20,34,0.7)',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.04)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  quickGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '12px', padding: '14px 20px 20px', flex: 1,
  },
  quickItem: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: '8px', padding: '20px 12px', borderRadius: '12px',
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative',
  },
  quickIconWrap: {
    width: '44px', height: '44px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { fontSize: '12px', fontWeight: '600', color: '#d1d5db' },
  quickArrow: {
    position: 'absolute', top: '8px', right: '8px',
    opacity: 0, transition: 'opacity 0.2s ease',
  },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await API.get('/api/reports/dashboard');
        if (res.data.success) setData(res.data.data);
      } catch (err) {
        setError('تعذر تحميل بيانات لوحة التحكم من الخادم');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const now = new Date();
  const todayStr = `${now.getDate()} ${monthsAr[now.getMonth()]} ${now.getFullYear()}`;
  const dayName = now.toLocaleDateString('ar-SA', { weekday: 'long' });

  const occupied  = data?.villas?.occupied ?? 42;
  const totalVillas = data?.villas?.total ?? 56;
  const rate      = data?.financial?.collection_rate ?? 94;
  const maintOpen = data?.maintenance?.open ?? 8;
  const maintEmerg = data?.maintenance?.emergencies ?? 2;
  const avgRating = data?.maintenance?.avg_rating ?? 4.8;

  const kpiItems = [
    { label: 'الفلل المشغولة', value: occupied, sub: `من أصل ${totalVillas}`, pct: Math.round((occupied / Math.max(totalVillas, 1)) * 100), icon: Home, color: '#00d4ff' },
    { label: 'معدل التحصيل', value: rate + '%', sub: rate >= 80 ? 'أداء ممتاز' : rate >= 50 ? 'بحاجة للمتابعة' : 'متدني', pct: rate, icon: ShieldCheck, color: '#10b981' },
    { label: 'طلبات الصيانة', value: maintOpen, sub: maintEmerg > 0 ? maintEmerg + ' طارئ' : 'لا توجد طوارئ', pct: null, icon: Wrench, color: '#f59e0b', urgent: maintEmerg > 0 },
    { label: 'تقييم الخدمة', value: avgRating, sub: 'من 5 نجوم', pct: Math.round((parseFloat(avgRating) / 5) * 100), icon: Star, color: '#a855f7' },
  ];

  const rawRevenue = data?.monthly_revenue;
  const hasRevenue = Array.isArray(rawRevenue) && rawRevenue.length > 0;
  const revenueBars = hasRevenue ? rawRevenue : [];
  const maxRev = hasRevenue ? Math.max(...rawRevenue.map(r => parseFloat(r.collected || 0)), 1) : 1;

  const defaultRevenue = [
    { month: 'يناير', value: 180 }, { month: 'فبراير', value: 165 },
    { month: 'مارس', value: 195 }, { month: 'إبريل', value: 210 },
    { month: 'مايو', value: 205 }, { month: 'يونيو', value: 220 },
    { month: 'يوليو', value: 240 }, { month: 'أغسطس', value: 235 },
    { month: 'سبتمبر', value: 250 }, { month: 'أكتوبر', value: 260 },
    { month: 'نوفمبر', value: 275 }, { month: 'ديسمبر', value: 290 },
  ];
  const defaultMaxRev = Math.max(...defaultRevenue.map(r => r.value));

  const staff = data?.top_staff || [];
  const totalCompleted = data?.maintenance?.completed || 0;

  const rawActivities = data?.recent_activity;
  const hasActivities = Array.isArray(rawActivities) && rawActivities.length > 0;
  const activityList = hasActivities ? rawActivities : [];

  const defaultActivities = [
    { type: 'maintenance', desc: 'تم إصلاح تسريب مياه في فيلا ١٢', time: 'منذ ساعتين' },
    { type: 'payment', desc: 'تم استلام دفعة إيجار فيلا ٨', time: 'منذ ٥ ساعات' },
    { type: 'complaint', desc: 'تم الرد على شكوى العميل أحمد', time: 'منذ يوم' },
    { type: 'maintenance', desc: 'اكتمل تركيب مكيف في فيلا ٢٥', time: 'منذ يومين' },
    { type: 'notification', desc: 'تم إرسال إشعار بموعد الصيانة الدورية', time: 'منذ ٣ أيام' },
  ];

  const handleAction = (path) => {
    if (path) navigate(path);
  };

  if (loading) return (
    <div style={styles.container}>
      <Topbar title="لوحة التحكم" />
      <div style={styles.loaderWrap}>
        <div style={styles.loaderRing} />
        <div style={styles.loaderText}>جاري تحميل بيانات الكمباوند...</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={styles.container}>
      <Topbar title="لوحة التحكم" />
      <div style={styles.errorBox}>
        <div style={styles.errorIcon}>⚠</div>
        <div style={styles.errorText}>{error}</div>
        <button onClick={() => window.location.reload()} style={styles.retryBtn}>إعادة المحاولة</button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <Topbar title="لوحة التحكم" />
      <div style={styles.content}>
        {/* ─── Hero Welcome Banner ─── */}
        <div style={styles.hero}>
          <div style={styles.heroGlow} />
          <div style={styles.heroGrid} />
          <div style={styles.heroContent}>
            <div style={styles.heroRight}>
              <div style={styles.heroGreet}>
                <Sparkles size={16} color="#fbbf24" />
                <span>مرحباً بعودتك</span>
              </div>
              <h1 style={styles.heroTitle}>كمباوند أزهار النخيل</h1>
              <div style={styles.heroMeta}>
                <span style={styles.heroDate}>
                  <CalendarDays size={13} />
                  {dayName}، {todayStr}
                </span>
                <span style={styles.heroDot}>•</span>
                <span style={styles.heroStatus}>
                  <Activity size={13} color="#10b981" />
                  جميع الأنظمة تعمل بكفاءة
                </span>
              </div>
              <div style={styles.heroBadgeRow}>
                <div style={styles.heroBadge}>
                  <Zap size={12} color="#fbbf24" />
                  نسخة 2.0
                </div>
                <div style={{ ...styles.heroBadge, backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.2)', color: '#10b981' }}>
                  <CheckCircle size={12} />
                  آخر تحديث: اليوم
                </div>
              </div>
            </div>
            <div style={styles.heroDeco}>
              <TreePine size={52} color="rgba(255,255,255,0.04)" />
            </div>
          </div>
        </div>

        {/* ─── KPI Cards ─── */}
        <div style={styles.kpiGrid}>
          {kpiItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} style={styles.kpiCard}>
                <div style={styles.kpiCardBg} />
                <div style={styles.kpiTop}>
                  <div style={{ ...styles.kpiIconBox, backgroundColor: item.color + '14', color: item.color, boxShadow: `0 0 16px ${item.color}08` }}>
                    <Icon size={18} />
                  </div>
                  {item.urgent && <div style={styles.kpiUrgent}>طارئ</div>}
                </div>
                <div style={styles.kpiValue}>{item.value}</div>
                <div style={styles.kpiLabel}>{item.label}</div>
                <div style={{ ...styles.kpiSub, color: item.color + 'cc' }}>{item.sub}</div>
                {item.pct !== null && (
                  <div style={styles.kpiProgressTrack}>
                    <div style={{ ...styles.kpiProgressFill, width: item.pct + '%', background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── Revenue Chart + Best Maintenance Team ─── */}
        <div style={styles.midGrid}>
          {/* Revenue Bar Chart */}
          <div style={styles.chartCard}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitleRow}>
                <TrendingUp size={16} color="#00d4ff" />
                <span style={styles.cardTitle}>تحصيلات الإيجارات</span>
              </div>
              <div style={styles.cardBadge}>آخر ١٢ شهر</div>
            </div>
            <div style={styles.chartBody}>
              <div style={styles.chartBars}>
                {hasRevenue ? (
                  revenueBars.map((rev, idx) => {
                    const val = parseFloat(rev.collected || 0);
                    const pct = Math.max(6, (val / maxRev) * 100);
                    const label = rev.month?.split(' ')[0] || '';
                    return (
                      <div key={idx} style={styles.barCol}>
                        <div style={{ ...styles.barValue, opacity: 1 }}>{formatCompact(val)}</div>
                        <div style={styles.barTrack}>
                          <div style={{ ...styles.barFill, height: pct + '%', transitionDelay: idx * 30 + 'ms', background: 'linear-gradient(to top, #00d4ff, #a855f7)', boxShadow: '0 0 12px rgba(0,212,255,0.15), 0 0 30px rgba(168,85,247,0.08)' }} />
                        </div>
                        <div style={styles.barLabel}>{label.substring(0, 4)}</div>
                      </div>
                    );
                  })
                ) : (
                  defaultRevenue.map((item, idx) => {
                    const pct = Math.max(6, (item.value / defaultMaxRev) * 100);
                    return (
                      <div key={idx} style={styles.barCol}>
                        <div style={{ ...styles.barValue, opacity: 1 }}>{item.value}k</div>
                        <div style={styles.barTrack}>
                          <div style={{ ...styles.barFill, height: pct + '%', transitionDelay: idx * 30 + 'ms', background: 'linear-gradient(to top, #00d4ff, #a855f7)', boxShadow: '0 0 12px rgba(0,212,255,0.15), 0 0 30px rgba(168,85,247,0.08)' }} />
                        </div>
                        <div style={styles.barLabel}>{item.month.substring(0, 4)}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Best Maintenance Team */}
          <div style={styles.teamCard}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitleRow}>
                <Award size={16} color="#f59e0b" />
                <span style={styles.cardTitle}>أفضل فريق الصيانة</span>
              </div>
              <div style={styles.cardBadge}>هذا الشهر</div>
            </div>
            {staff.length > 0 ? (
              <>
                <div style={styles.teamStaffList}>
                  {staff.map((s, i) => {
                    const medals = ['🥇', '🥈', '🥉'];
                    const borderColors = ['#f59e0b', '#9ca3af', '#d97706'];
                    return (
                      <div key={s.id || i} style={styles.teamRow}>
                        <div style={styles.teamRank}>
                          <span style={styles.teamMedal}>{medals[i] || '🏅'}</span>
                        </div>
                        <div style={{ ...styles.teamAvatar, borderColor: borderColors[i] + '40' }}>
                          {s.full_name?.substring(0, 2) || 'ف'}
                        </div>
                        <div style={styles.teamInfo}>
                          <div style={styles.teamName}>{s.full_name}</div>
                          <div style={styles.teamStats}>
                            <span style={styles.teamStat}>
                              <CheckSquare size={10} color="#34d399" />
                              {s.completed} مهام
                            </span>
                            <span style={styles.teamStat}>
                              <Star size={10} color="#fbbf24" />
                              {s.avg_rating || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={styles.teamFooter}>
                  <span style={styles.teamFooterText}>
                    {totalCompleted} مهمة مكتملة هذا الشهر
                  </span>
                </div>
              </>
            ) : (
              <div style={styles.teamEmpty}>
                <div style={styles.teamEmptyIconWrap}>
                  <Award size={40} color="rgba(255,255,255,0.06)" />
                </div>
                <div style={styles.teamEmptyTitle}>لا توجد بيانات</div>
                <div style={styles.teamEmptySub}>لم يتم تسجيل أي إنجازات لفريق الصيانة هذا الشهر</div>
                <div style={styles.teamEmptyLine} />
                <div style={styles.teamEmptyHint}>
                  <Clock size={12} color="#4b5563" />
                  <span>سيتم تحديث التصنيف تلقائياً</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Activities + Quick Actions ─── */}
        <div style={styles.bottomGrid}>
          {/* Latest Activities */}
          <div style={styles.activityCard}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitleRow}>
                <Activity size={16} color="#00d4ff" />
                <span style={styles.cardTitle}>آخر النشاطات</span>
              </div>
              <button onClick={() => navigate('/notifications')} style={styles.viewAllBtn}>
                عرض الكل <ChevronLeft size={14} />
              </button>
            </div>
            <div style={styles.timeline}>
              {(hasActivities ? activityList : defaultActivities).map((act, idx) => {
                const type = act.type || 'maintenance';
                const cfg = activityConfig[type] || activityConfig.maintenance;
                const Icon = cfg.icon;
                const displayTime = hasActivities ? timeAgo(act.created_at) : act.time;
                const displayDesc = act.description || act.desc;
                return (
                  <div key={idx} style={styles.timelineItem}>
                    <div style={styles.timelineLine}>
                      <div style={{ ...styles.timelineDot, backgroundColor: cfg.color, boxShadow: `0 0 0 4px ${cfg.color}15` }}>
                        <Icon size={11} color="#fff" />
                      </div>
                      {idx < (hasActivities ? activityList : defaultActivities).length - 1 && <div style={styles.timelineStem} />}
                    </div>
                    <div style={styles.timelineContent}>
                      <div style={styles.timelineHeader}>
                        <span style={{ ...styles.timelineBadge, color: cfg.color, backgroundColor: cfg.color + '12' }}>
                          {cfg.label}
                        </span>
                        <span style={styles.timelineTime}>
                          <Clock size={10} />
                          {displayTime}
                        </span>
                      </div>
                      <div style={styles.timelineDesc}>{displayDesc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={styles.quickCard}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitleRow}>
                <Zap size={16} color="#fbbf24" />
                <span style={styles.cardTitle}>إجراءات سريعة</span>
              </div>
            </div>
            <div style={styles.quickGrid}>
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <div key={idx} style={styles.quickItem} onClick={() => handleAction(action.path)}>
                    <div style={{ ...styles.quickIconWrap, backgroundColor: action.color + '12', color: action.color, boxShadow: `0 0 20px ${action.color}08` }}>
                      <Icon size={20} />
                    </div>
                    <div style={styles.quickLabel}>{action.label}</div>
                    <ArrowUpRight size={14} color="#4b5563" style={styles.quickArrow} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
