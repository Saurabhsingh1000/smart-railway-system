import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Train, User, LogOut, ShieldAlert, Ticket, Search, CheckCircle2 } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <div className="nav-container">
        <Link to="/" className="brand-logo">
          <div className="brand-icon">
            <Train size={22} />
          </div>
          <span>RailStream</span>
        </Link>

        <nav>
          <ul className="nav-links">
            <li>
              <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Search size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Search Trains
              </NavLink>
            </li>
            <li>
              <NavLink to="/pnr" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Ticket size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                PNR Status
              </NavLink>
            </li>
            {user && (
              <li>
                <NavLink to="/my-bookings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  My Bookings
                </NavLink>
              </li>
            )}
            {user?.role === 'ADMIN' && (
              <li>
                <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ color: '#818cf8' }}>
                  <ShieldAlert size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Admin Analytics
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.06)', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
                <User size={15} color="#38bdf8" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name.split(' ')[0]}</span>
                {user.role === 'ADMIN' && <span className="badge badge-class" style={{ fontSize: '0.65rem' }}>ADMIN</span>}
              </div>
              <button onClick={logout} className="btn btn-ghost" title="Logout" style={{ padding: '0.45rem 0.75rem' }}>
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link to="/login" className="btn btn-ghost" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
