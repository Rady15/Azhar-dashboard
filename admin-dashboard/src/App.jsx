import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Villas from './pages/Villas';
import Tenants from './pages/Tenants';
import Maintenance from './pages/Maintenance';
import Complaints from './pages/Complaints';
import Payments from './pages/Payments';
import Bus from './pages/Bus';
import Staff from './pages/Staff';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Facilities from './pages/Facilities';
import Backups from './pages/Backups';
import Profile from './pages/Profile';

const PrivateRoute = ({ children }) => {
  const { token, loading } = useContext(AuthContext);

  if (loading) return <div style={styles.loading}>جاري التحميل...</div>;
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div style={styles.layout}>
      <div style={styles.mainContent}>{children}</div>
      <Sidebar />
    </div>
  );
};

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/villas" element={<PrivateRoute><Villas /></PrivateRoute>} />
      <Route path="/tenants" element={<PrivateRoute><Tenants /></PrivateRoute>} />
      <Route path="/maintenance" element={<PrivateRoute><Maintenance /></PrivateRoute>} />
      <Route path="/complaints" element={<PrivateRoute><Complaints /></PrivateRoute>} />
      <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>} />
      <Route path="/bus" element={<PrivateRoute><Bus /></PrivateRoute>} />
      <Route path="/staff" element={<PrivateRoute><Staff /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/facilities" element={<PrivateRoute><Facilities /></PrivateRoute>} />
      <Route path="/backups" element={<PrivateRoute><Backups /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0b0f19'
  },
  mainContent: {
    flex: 1,
    marginRight: '0px' // Sidebar takes 260px and has right-aligned positioning
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#0b0f19',
    color: '#9ca3af',
    fontFamily: 'Zain, sans-serif',
    fontSize: '16px'
  }
};
