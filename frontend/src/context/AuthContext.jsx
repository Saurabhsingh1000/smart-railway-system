import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('railway_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getCurrentUser();
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          localStorage.removeItem('railway_token');
        }
      } catch (err) {
        localStorage.removeItem('railway_token');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    if (res.success && res.token) {
      localStorage.setItem('railway_token', res.token);
      setUser(res.user);
      addToast(`Welcome back, ${res.user.name}!`, 'success');
      return res.user;
    }
    throw new Error('Authentication failed');
  };

  const register = async (name, email, password) => {
    const res = await api.register(name, email, password);
    if (res.success && res.token) {
      localStorage.setItem('railway_token', res.token);
      setUser(res.user);
      addToast(`Account created successfully! Welcome ${res.user.name}`, 'success');
      return res.user;
    }
    throw new Error('Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('railway_token');
    setUser(null);
    addToast('You have been logged out.', 'info');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, addToast }}>
      {children}
      {/* Global Toast Render */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
