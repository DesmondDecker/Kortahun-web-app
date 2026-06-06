// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,          setUser]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [connStatus,    setConnStatus]    = useState('checking');

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('ku_token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await auth.verify();
      setUser(res.user);
    } catch {
      localStorage.removeItem('ku_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      await fetch('/api/health');
      setConnStatus('connected');
    } catch {
      setConnStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    checkAuth();
    checkConnection();
    const interval = setInterval(checkConnection, 60_000);
    return () => clearInterval(interval);
  }, [checkAuth, checkConnection]);

  const login = async (credentials) => {
    const res = await auth.login(credentials);
    localStorage.setItem('ku_token', res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('ku_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, connStatus, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
