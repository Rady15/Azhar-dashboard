import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Home, 
  Users, 
  Wrench, 
  MessageSquare, 
  CreditCard, 
  TrendingUp, 
  Megaphone, 
  Bus, 
  UserSquare, 
  Bell,
  Building,
  Database,
  LogOut,
  UserCog
} from 'lucide-react';

const Sidebar = () => {
  const { logout, user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;

  const menuItems = [
    { name: 'لوحة التحكم', path: '/', icon: LayoutDashboard },
    { name: 'الفلل', path: '/villas', icon: Home },
    { name: 'المستأجرين', path: '/tenants', icon: Users },
    { name: 'مركز الصيانة', path: '/maintenance', icon: Wrench },
    { name: 'الشكاوى', path: '/complaints', icon: MessageSquare },
    { name: 'المدفوعات', path: '/payments', icon: CreditCard },
    { name: 'حافلات المدارس', path: '/bus', icon: Bus },
    { name: 'فريق العمل', path: '/staff', icon: UserSquare },
    { name: 'المرافق', path: '/facilities', icon: Building },
    { name: 'الإشعارات', path: '/notifications', icon: Bell },
    { name: 'التقارير المالية', path: '/reports', icon: TrendingUp },
    { name: 'الملف الشخصي', path: '/profile', icon: UserCog }
  ];

  const superAdminItems = [
    { name: 'النسخ الاحتياطية', path: '/backups', icon: Database }
  ];

  return (
    <aside className="sidebar-container" style={styles.sidebar}>
      <div style={styles.sidebarGlow} />
      <div className="sidebar-logo" style={styles.logoContainer}>
        <img src="/logo.png" alt="Azhar" style={styles.logoImg} />
      </div>

      <nav style={styles.nav}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
              style={({ isActive }) => ({
                ...styles.navItem,
                color: isActive ? '#15D9E8' : '#9ca3af',
              })}
            >
              <Icon size={18} style={styles.icon} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {isAdmin && (
        <div style={styles.superSection}>
          <div style={styles.superLabel}>⚡ {isSuperAdmin ? 'Super Admin' : 'Admin'}</div>
          {superAdminItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) => `sidebar-link sidebar-link-gold${isActive ? ' sidebar-link-gold-active' : ''}`}
                style={({ isActive }) => ({
                  ...styles.navItem,
                  color: isActive ? '#D4B06A' : '#9ca3af',
                })}
              >
                <Icon size={18} style={styles.icon} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      )}

      <div style={styles.footer}>
        <button onClick={logout} className="sidebar-logout" style={styles.logoutBtn}>
          <LogOut size={18} style={styles.icon} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: '260px',
    background: 'linear-gradient(180deg, rgba(7,20,39,0.95) 0%, rgba(10,24,44,0.92) 100%)',
    borderLeft: '1px solid rgba(21,217,232,0.06)',
    height: '100vh',
    position: 'fixed',
    right: 0,
    top: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    fontFamily: 'Zain, sans-serif',
    boxShadow: 'inset 0 1px 0 rgba(21,217,232,0.04)',
  },
  sidebarGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '180px',
    background: 'radial-gradient(ellipse at 50% 0%, rgba(21,217,232,0.04) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  logoContainer: {
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(21,217,232,0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  },
  logoImg: {
    width: '100%',
    maxWidth: '170px',
    height: 'auto',
    objectFit: 'contain',
    filter: 'brightness(0) invert(1)',
  },
  nav: {
    padding: '20px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    overflowY: 'auto',
    position: 'relative',
    zIndex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '500',
    textDecoration: 'none',
    direction: 'rtl',
  },
  icon: {
    flexShrink: 0,
  },
  footer: {
    padding: '16px 16px',
    borderTop: '1px solid rgba(21,217,232,0.06)',
    position: 'relative',
    zIndex: 1,
  },
  logoutBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 14px',
    borderRadius: '10px',
    backgroundColor: 'rgba(239,68,68,0.04)',
    border: '1px solid rgba(239,68,68,0.08)',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    textAlign: 'right',
    direction: 'rtl',
  },
  superSection: {
    padding: '6px 10px',
    borderTop: '1px solid rgba(212,176,106,0.1)',
    borderBottom: '1px solid rgba(21,217,232,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    position: 'relative',
    zIndex: 1,
  },
  superLabel: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#D4B06A',
    letterSpacing: '1px',
    padding: '4px 14px 4px',
    textTransform: 'uppercase',
  },
};

export default Sidebar;
