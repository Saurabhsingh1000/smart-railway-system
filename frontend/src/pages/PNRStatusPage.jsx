import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Search, Ticket, Train, AlertTriangle, CheckCircle, Clock, Trash2, Printer, Loader2 } from 'lucide-react';

export default function PNRStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPnr = searchParams.get('pnr') || '';

  const [pnrInput, setPnrInput] = useState(initialPnr);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [searched, setSearched] = useState(false);

  const { addToast } = useAuth();

  useEffect(() => {
    if (initialPnr) {
      fetchPNR(initialPnr);
    }
  }, [initialPnr]);

  const fetchPNR = async (pnrToQuery) => {
    if (!pnrToQuery || !pnrToQuery.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const res = await api.getPNRStatus(pnrToQuery.trim());
      if (res.success && res.booking) {
        setBooking(res.booking);
      } else {
        setBooking(null);
        addToast(res.error || 'PNR not found', 'error');
      }
    } catch (err) {
      setBooking(null);
      addToast(err.message || 'Error fetching PNR details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (pnrInput.trim()) {
      setSearchParams({ pnr: pnrInput.trim() });
      fetchPNR(pnrInput.trim());
    }
  };

  const handleCancelTicket = async () => {
    if (!booking) return;
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel booking PNR ${booking.pnr}? If waitlisted passengers exist, the next passenger in queue will be automatically promoted.`
    );
    if (!confirmCancel) return;

    setCancelling(true);
    try {
      const res = await api.cancelBooking(booking.pnr);
      if (res.success) {
        addToast('Ticket cancelled successfully! Seat released and waitlist re-allocated.', 'success');
        // Refresh PNR
        fetchPNR(booking.pnr);
      } else {
        addToast(res.error || 'Cancellation failed', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error cancelling booking', 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="main-content">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>PNR Inquiry & Live Status</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Enter your 10-digit Passenger Name Record (PNR) to verify live seat assignment and waitlist position
        </p>
      </div>

      {/* Search Input Box */}
      <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto 2.5rem', padding: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Enter 10-Digit PNR (e.g. 1000000001)"
              className="input-field mono"
              value={pnrInput}
              onChange={(e) => setPnrInput(e.target.value)}
              style={{ fontSize: '1.1rem', letterSpacing: '0.05em' }}
              maxLength={12}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0.75rem 1.5rem' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Inquire
          </button>
        </form>
      </div>

      {/* Ticket Result Display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
          Retrieving ACID transaction record...
        </div>
      ) : booking ? (
        <div className="glass-panel glow-card" style={{ maxWidth: '850px', margin: '0 auto', padding: '2rem' }}>
          {/* Ticket Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.25rem', marginBottom: '1.5rem', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>PASSENGER NAME RECORD</span>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                {booking.pnr}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={`badge ${booking.booking_status === 'CONFIRMED' ? 'badge-confirmed' : booking.booking_status === 'WAITING' ? 'badge-waiting' : 'badge-cancelled'}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.9rem' }}>
                {booking.booking_status}
              </span>
              <span className="badge badge-class" style={{ fontSize: '0.9rem', padding: '0.4rem 0.9rem' }}>
                Class {booking.class}
              </span>
            </div>
          </div>

          {/* Train & Journey Route */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span className="train-no-badge">{booking.train_no}</span>
              <h3 style={{ fontSize: '1.2rem' }}>{booking.train_name}</h3>
              <span style={{ fontSize: '0.8rem', color: '#a5b4fc' }}>({booking.train_type})</span>
            </div>

            <div className="route-timeline" style={{ marginBottom: 0 }}>
              <div className="station-point">
                <span className="station-code">{booking.from_station_code}</span>
                <span className="station-name">{booking.from_station_name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Journey: {booking.journey_date ? new Date(booking.journey_date).toLocaleDateString() : 'Confirmed Date'}
                </span>
              </div>

              <div className="route-divider">
                <div className="route-line"></div>
                <span style={{ fontSize: '0.7rem' }}>CONFIRMED ITINERARY</span>
              </div>

              <div className="station-point right">
                <span className="station-code">{booking.to_station_code}</span>
                <span className="station-name">{booking.to_station_name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Booked: {booking.booked_at ? new Date(booking.booked_at).toLocaleDateString() : 'Recent'}
                </span>
              </div>
            </div>
          </div>

          {/* Passengers Table */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
              PASSENGER & BERTH ALLOCATION
            </h4>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Passenger Name</th>
                    <th>Age / Gender</th>
                    <th>Booking Status</th>
                    <th>Coach & Berth</th>
                  </tr>
                </thead>
                <tbody>
                  {(booking.passengers || []).map((p, idx) => (
                    <tr key={p.passenger_id || idx}>
                      <td style={{ color: 'var(--text-subtle)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.age} yrs &bull; {p.gender}</td>
                      <td>
                        <span className={`badge ${p.status === 'CONFIRMED' ? 'badge-confirmed' : p.status === 'WAITING' ? 'badge-waiting' : 'badge-cancelled'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        {p.status === 'CONFIRMED' && p.coach_no ? (
                          <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                            Coach {p.coach_no} / Seat {p.seat_no} ({p.berth_type || 'Berth'})
                          </span>
                        ) : p.status === 'WAITING' ? (
                          <span style={{ fontWeight: 700, color: '#f59e0b' }}>
                            WL Position #{p.waitlist_position || 1}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-subtle)' }}>Cancelled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & Action Footers */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TRANSACTION SUMMARY</span>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                Total Fare: <span style={{ color: '#10b981' }}>₹{booking.fare}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => window.print()} className="btn btn-ghost">
                <Printer size={16} /> Print Ticket
              </button>
              {booking.booking_status !== 'CANCELLED' && (
                <button
                  onClick={handleCancelTicket}
                  className="btn btn-danger"
                  disabled={cancelling}
                >
                  <Trash2 size={16} /> {cancelling ? 'Cancelling...' : 'Cancel Reservation'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : searched ? (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem 1.5rem' }}>
          <AlertTriangle size={36} color="#f59e0b" style={{ margin: '0 auto 0.75rem' }} />
          <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No records found for PNR: {pnrInput}</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Please check the 10-digit number. You can test with pre-seeded demo bookings or book a fresh ticket on the Search page.
          </p>
        </div>
      ) : null}
    </div>
  );
}
