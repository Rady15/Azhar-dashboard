import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ShieldAlert, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const ADMIN_EMAIL    = 'admin@nakheel-compound.sa';
const ADMIN_PASSWORD = 'Admin@1234';

const monthsAr = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 2 + Math.random() * 4,
  delay: Math.random() * 8,
  duration: 6 + Math.random() * 8,
  opacity: 0.15 + Math.random() * 0.25,
}));

const Login = () => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [time, setTime] = useState(new Date());
  const [focusedField, setFocusedField] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) navigate('/');
    else setError(result.error);
  };

  const handleQuickLogin = async () => {
    setError('');
    setQuickLoading(true);
    setEmail(ADMIN_EMAIL);
    setPassword(ADMIN_PASSWORD);
    const result = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    setQuickLoading(false);
    if (result.success) navigate('/');
    else setError(result.error);
  };

  const isDisabled = loading || quickLoading;
  const h = time.getHours().toString().padStart(2, '0');
  const m = time.getMinutes().toString().padStart(2, '0');
  const dayName = time.toLocaleDateString('ar-SA', { weekday: 'long' });
  const dateStr = `${time.getDate()} ${monthsAr[time.getMonth()]} ${time.getFullYear()}`;

  return (
    <div style={styles.page}>
      <style>{animations}</style>
      <div style={styles.bgImage} />
      <div style={styles.bgOverlay} />
      <div style={styles.bgPattern} />

      {particles.map(p => (
        <div
          key={p.id}
          style={{
            ...styles.particle,
            width: p.size,
            height: p.size,
            left: p.left + '%',
            top: p.top + '%',
            opacity: p.opacity,
            animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}

      <div style={styles.topBar}>
        <div style={styles.timeWidget}>
          <span style={styles.timeDigits}>{h}:{m}</span>
          <span style={styles.timeDate}>{dayName}، {dateStr}</span>
        </div>
      </div>

      <div style={styles.cardWrapper}>
        <div style={styles.cardBorderGlow} />
        <div style={styles.card}>
          <div style={styles.cardReflection} />
          <div style={styles.cardInner}>
              <div style={styles.logoSection}>
                <div style={styles.logoWrap}>
                  <img src="/logo.png" alt="AZHAR" style={styles.logo} />
                </div>
                <span style={styles.brandResidence}>R E S I D E N C E</span>
              </div>

            <div style={styles.welcomeSection}>
              <h1 style={styles.welcomeTitle}>مرحباً بك</h1>
              <div style={styles.welcomeLine} />
              <p style={styles.welcomeSub}>سجل الدخول لإدارة كمباوند أزهار</p>
            </div>

            {error && (
              <div style={styles.errorBox}>
                <ShieldAlert size={13} style={{ marginLeft: '8px', flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.field}>
                <label style={styles.fieldLabel}>البريد الإلكتروني</label>
                <div style={{
                  ...styles.fieldBox,
                  borderColor: focusedField === 'email' ? 'rgba(21,217,232,0.3)' : 'rgba(255,255,255,0.04)',
                  boxShadow: focusedField === 'email' ? '0 0 20px rgba(21,217,232,0.06)' : 'none',
                }}>
                  <div style={styles.fieldIconBox}>
                    <Mail size={14} color="#15D9E8" />
                  </div>
                  <input
                    type="email"
                    placeholder="admin@compound.sa"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                    style={styles.fieldInput}
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.fieldLabel}>كلمة المرور</label>
                <div style={{
                  ...styles.fieldBox,
                  borderColor: focusedField === 'password' ? 'rgba(21,217,232,0.3)' : 'rgba(255,255,255,0.04)',
                  boxShadow: focusedField === 'password' ? '0 0 20px rgba(21,217,232,0.06)' : 'none',
                }}>
                  <div style={styles.fieldIconBox}>
                    <Lock size={14} color="#15D9E8" />
                  </div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    style={styles.fieldInput}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} style={styles.eyeToggle}>
                    {showPw ? <EyeOff size={14} color="#6b7280" /> : <Eye size={14} color="#6b7280" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isDisabled}
                style={{
                  ...styles.loginBtn,
                  opacity: isDisabled ? 0.5 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                <span>{loading ? 'جاري التحميل...' : 'تسجيل الدخول'}</span>
                <ArrowLeft size={16} style={{ marginRight: '10px' }} />
              </button>
            </form>

            <div style={styles.divider}>
              <span style={styles.dividerLine} />
              <span style={styles.dividerText}>أو</span>
              <span style={styles.dividerLine} />
            </div>

            <div style={styles.accessCard}>
              <div style={styles.accessLeft}>
                <div style={styles.accessText}>
                  <span style={styles.accessLabel}>دخول سريع</span>
                  <span style={styles.accessSub}>كمدير النظام</span>
                </div>
              </div>
              <button
                id="quick-admin-login"
                onClick={handleQuickLogin}
                disabled={isDisabled}
                style={{
                  ...styles.accessBtn,
                  opacity: isDisabled ? 0.5 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                }}
              >
                {quickLoading ? '...' : 'دخول'}
              </button>
            </div>

            <div style={styles.bottomDeco}>
              <svg width="160" height="12" viewBox="0 0 160 12" fill="none">
                <path d="M0 6 Q25 0 50 6 Q75 12 100 6 Q125 0 150 6" stroke="rgba(21,217,232,0.08)" strokeWidth="0.6" fill="none" />
              </svg>
              <div style={styles.securityRow}>
                <span style={styles.securityText}>
                  يضمن هذا النظام حماية كاملة للبيانات. أي ولوج غير مصرح به يعرض صاحبه للمساءلة القانونية.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const animations = `
  @keyframes floatParticle {
    0% { transform: translateY(0) translateX(0); opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { transform: translateY(-60px) translateX(20px); opacity: 0; }
  }
  @keyframes borderRotate {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes glowPulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }
`;

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Zain, sans-serif',
    position: 'relative',
    overflow: 'hidden',
    background: '#071427',
  },
  bgImage: {
    position: 'absolute', inset: 0,
    background: 'url(/Login.png) center / cover no-repeat',
    filter: 'blur(3px)',
    transform: 'scale(1.05)',
  },
  bgOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(135deg, rgba(7,20,39,0.88) 0%, rgba(7,20,39,0.55) 45%, rgba(7,20,39,0.82) 100%)',
  },
  bgPattern: {
    position: 'absolute', inset: 0,
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.012) 1px, transparent 1px)',
    backgroundSize: '50px 50px',
  },
  particle: {
    position: 'absolute',
    borderRadius: '50%',
    backgroundColor: '#15D9E8',
    pointerEvents: 'none',
    zIndex: 1,
  },
  topBar: {
    position: 'fixed',
    top: '28px',
    left: '36px',
    zIndex: 10,
  },
  timeWidget: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  timeDigits: {
    fontSize: '26px',
    fontWeight: '300',
    color: 'rgba(255,255,255,0.25)',
    fontFamily: 'Zain, sans-serif',
    letterSpacing: '2px',
    lineHeight: 1,
  },
  timeDate: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.15)',
    fontWeight: '500',
  },
  cardWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    zIndex: 2,
    padding: '3px',
  },
  cardBorderGlow: {
    position: 'absolute',
    inset: '-2px',
    borderRadius: '38px',
    background: 'linear-gradient(135deg, rgba(21,217,232,0.15), rgba(212,176,106,0.08), rgba(21,217,232,0.05), rgba(212,176,106,0.12))',
    zIndex: 0,
  },
  card: {
    position: 'relative',
    borderRadius: '35px',
    overflow: 'hidden',
    background: 'linear-gradient(160deg, rgba(10,24,44,0.85) 0%, rgba(7,20,39,0.9) 50%, rgba(8,18,34,0.85) 100%)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(21,217,232,0.08)',
    boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 60px rgba(21,217,232,0.03), inset 0 1px 0 rgba(255,255,255,0.03)',
  },
  cardReflection: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '120px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
    pointerEvents: 'none',
  },
  cardInner: {
    position: 'relative',
    padding: '28px 30px 24px',
    zIndex: 1,
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '14px',
  },
  logo: {
    width: '190px',
    height: 'auto',
    objectFit: 'contain',
    filter: 'brightness(0) invert(1)',
  },
  brandResidence: {
    display: 'block',
    fontSize: '8px',
    fontWeight: '600',
    color: '#D4B06A',
    letterSpacing: '6px',
    fontFamily: 'Zain, sans-serif',
    marginTop: '-4px',
  },
  welcomeSection: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  welcomeTitle: {
    fontSize: '23px',
    fontWeight: '700',
    color: '#f0f4ff',
    margin: 0,
  },
  welcomeLine: {
    width: '50px',
    height: '1.5px',
    background: 'linear-gradient(90deg, transparent, #15D9E8, transparent)',
    margin: '10px auto',
    borderRadius: '2px',
  },
  welcomeSub: {
    fontSize: '11px',
    color: '#6b7280',
    margin: 0,
    fontWeight: '500',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.05)',
    border: '1px solid rgba(239,68,68,0.1)',
    borderRadius: '12px',
    padding: '9px 13px',
    color: '#f87171',
    fontSize: '11px',
    marginBottom: '18px',
    direction: 'rtl',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    textAlign: 'right',
  },
  fieldLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#9ca3af',
    paddingRight: '4px',
  },
  fieldBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '14px',
    transition: 'all 0.3s ease',
    paddingRight: '10px',
    height: '50px',
  },
  fieldIconBox: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    backgroundColor: 'rgba(21,217,232,0.06)',
    border: '1px solid rgba(21,217,232,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    height: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '0 12px 0 10px',
    color: '#f0f4ff',
    fontSize: '13px',
    outline: 'none',
    textAlign: 'right',
  },
  eyeToggle: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    padding: '6px',
    flexShrink: 0,
  },
  loginBtn: {
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #15D9E8 0%, #0ba5b3 100%)',
    border: 'none',
    borderRadius: '14px',
    color: '#071427',
    fontSize: '14px',
    fontWeight: '700',
    marginTop: '4px',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 30px rgba(21,217,232,0.25)',
    cursor: 'pointer',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '18px 0 14px',
  },
  dividerLine: {
    flex: 1,
    height: '0.5px',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dividerText: {
    fontSize: '10px',
    color: '#4b5563',
    whiteSpace: 'nowrap',
  },
  accessCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(212,176,106,0.03)',
    border: '1px solid rgba(212,176,106,0.08)',
    borderRadius: '14px',
    padding: '11px 14px',
    direction: 'rtl',
    height: '48px',
  },
  accessLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  accessText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    textAlign: 'right',
  },
  accessLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#d1d5db',
  },
  accessSub: {
    fontSize: '10px',
    color: '#6b7280',
  },
  accessBtn: {
    display: 'flex',
    alignItems: 'center',
    height: '32px',
    padding: '0 14px',
    background: 'linear-gradient(135deg, #D4B06A 0%, #b8944f 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#071427',
    fontSize: '11px',
    fontWeight: '700',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(212,176,106,0.15)',
  },
  bottomDeco: {
    marginTop: '18px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  securityRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  securityText: {
    fontSize: '9px',
    color: '#4b5563',
    lineHeight: 1.7,
    textAlign: 'center',
  },
};

export default Login;
