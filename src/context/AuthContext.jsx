import React, { createContext, useState, useEffect } from 'react';
import API from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    const storedUser = localStorage.getItem('admin_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await API.post('/api/auth/admin/login', { email, password });
      if (res.data.success) {
        const { access_token, user: userData } = res.data.data;
        localStorage.setItem('admin_token', access_token);
        localStorage.setItem('admin_user', JSON.stringify(userData));
        setToken(access_token);
        setUser(userData);
        return { success: true };
      } else {
        return { success: false, error: res.data.message || 'Login failed' };
      }
    } catch (err) {
      console.error(err);
      return { 
        success: false, 
        error: err.response?.data?.message || 'Connection to server failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setToken(null);
    setUser(null);
  };

  const updateUserState = (newUserData) => {
    localStorage.setItem('admin_user', JSON.stringify(newUserData));
    setUser(newUserData);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUserState }}>
      {children}
    </AuthContext.Provider>
  );

};
