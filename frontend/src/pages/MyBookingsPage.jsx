import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Ticket, ArrowRight, Eye, Trash2, Calendar, MapPin, Loader2, AlertCircle } from 'lucide-react';

export default function MyBookingsPage() {
  const { user, addToast } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadBookings();
  }, [user]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await api.getMyBookings();
      if (res.success) {
        setBookings(res.bookings || []);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load booking history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (pnr) => {
    const confirm = window.confirm(`Cancel booking PNR ${pnr}? This will immediately release your allocated seat to downstream waitlisted passengers.`);
    if (!confirm) return;

    try {
      const res = await api.cancelBooking(pnr);
      if (res.success) {
        addToast(`Booking ${pnr} cancelled successfully.`, 'success');
        loadBookings();
      }
    } catch (err) {
      addToast(err.message || 'Cancellation failed', 'error');
    }
  };

  if (!user) {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '5rem 1.5rem' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem' }}>
          <AlertCircle size={40} color="#6366f1" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Sign In Required</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Please log in to your account to review booking receipts and manage ticket cancellations.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
            Proceed to Sign In
          </Link>
        </div>
      </div>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'ALL') return true;
    return b.status === filter;
  });

  return (
    <div className="main-content">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>My Reservations</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Transaction history tied to account <strong>{user.email}</strong>
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '0.35rem', borderRadius: '10px' }}>
          {['ALL', 'CONFIRMED', 'WAITING', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`btn ${filter === tab ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ color: 'var(--text-muted)' }}>Fetching booking transactions...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Ticket size={48} color="#6366f1" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No bookings matching filter '{filter}'</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Ready to explore? Book tickets across our network with instant confirmation guarantees.
          </p>
          <Link to="/" className="btn btn-cyan">
            Book a Train Ticket
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredBookings.map((b) => (
            <div key={b.pnr} className="glass-panel glow-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1rem', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="train-no-badge">{b.train_no}</span>
                  <h4 style={{ fontSize: '1.15rem' }}>{b.train_name}</h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="mono" style={{ fontSize: '0.9rem', color: '#38bdf8', fontWeight: 700 }}>
                    PNR: {b.pnr}
                  </span>
                  <span className={`badge ${b.status === 'CONFIRMED' ? 'badge-confirmed' : b.status === 'WAITING' ? 'badge-waiting' : 'badge-cancelled'}`}>
                    {b.status}
                  </span>
                  <span className="badge badge-class">
                    {b.class}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FROM</span>
                  <div style={{ fontWeight: 600 }}>{b.from_station}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TO</span>
                  <div style={{ fontWeight: 600 }}>{b.to_station}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JOURNEY DATE</span>
                  <div style={{ fontWeight: 600 }}>
                    {b.journey_date ? new Date(b.journey_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FARE PAID</span>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>₹{b.fare}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
                <Link to={`/pnr?pnr=${b.pnr}`} className="btn btn-ghost" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
                  <Eye size={15} /> View Boarding Pass
                </Link>
                {b.status !== 'CANCELLED' && (
                  <button
                    onClick={() => handleCancel(b.pnr)}
                    className="btn btn-danger"
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                  >
                    <Trash2 size={15} /> Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
