import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Train, ShieldCheck, UserCheck, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, addToast } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      addToast(err.message || 'Login failed. Please check credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    login(demoEmail, demoPassword)
      .then(() => navigate('/'))
      .catch((err) => addToast(err.message || 'Quick login failed', 'error'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel glow-card" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-icon" style={{ margin: '0 auto 1rem', width: '48px', height: '48px' }}>
            <Train size={28} />
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Access your RailStream bookings & live transit account
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div className="input-group">
            <label className="input-label">
              <Mail size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              placeholder="e.g. user1@railway.com"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <Lock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              PASSWORD
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', textAlign: 'center', marginBottom: '0.75rem' }}>
            ONE-CLICK DEMO AUTHENTICATION
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('user1@railway.com', 'User@123')}
              className="btn btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.5rem' }}
            >
              <UserCheck size={14} color="#38bdf8" /> Demo Passenger
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@railway.com', 'Admin@123')}
              className="btn btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.5rem' }}
            >
              <ShieldCheck size={14} color="#a5b4fc" /> Demo Admin
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Don't have an account yet?{' '}
          <Link to="/register" style={{ color: '#818cf8', fontWeight: 600 }}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
