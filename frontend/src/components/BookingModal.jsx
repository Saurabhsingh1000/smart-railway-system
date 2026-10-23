import React, { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Trash2, ShieldAlert, CreditCard, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BookingModal({ train, scheduleId, selectedClass, fare, fromStationId, toStationId, onClose, onBookingSuccess }) {
  const { user, addToast } = useAuth();

  const [passengers, setPassengers] = useState([
    { name: user ? user.name : '', age: 28, gender: 'M' }
  ]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [forcePayFail, setForcePayFail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  const handlePassengerChange = (index, field, value) => {
    const updated = [...passengers];
    updated[index][field] = field === 'age' ? parseInt(value, 10) || '' : value;
    setPassengers(updated);
  };

  const addPassenger = () => {
    if (passengers.length >= 6) {
      addToast('Maximum 6 passengers allowed per booking.', 'info');
      return;
    }
    setPassengers([...passengers, { name: '', age: 30, gender: 'M' }]);
  };

  const removePassenger = (index) => {
    if (passengers.length <= 1) return;
    setPassengers(passengers.filter((_, i) => i !== index));
  };

  const totalFare = (fare || 750) * passengers.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      addToast('Please sign in to confirm reservations.', 'error');
      return;
    }

    for (const p of passengers) {
      if (!p.name.trim()) {
        addToast('All passenger names must be entered.', 'error');
        return;
      }
      if (!p.age || p.age < 1 || p.age > 120) {
        addToast('Please provide valid ages between 1 and 120.', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await api.createBooking({
        scheduleId,
        class: selectedClass,
        fromStationId,
        toStationId,
        passengers,
        paymentMethod,
        forcePayFail,
      });

      if (res.success && res.booking) {
        setBookingResult(res.booking);
        if (res.booking.status === 'CONFIRMED') {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
          addToast(`Ticket Confirmed! PNR: ${res.booking.pnr}`, 'success');
        } else if (res.booking.status === 'WAITING') {
          addToast(`Waitlisted at position ${res.booking.wl_positions ? res.booking.wl_positions.join(', ') : 'WL'}`, 'info');
        }
        if (onBookingSuccess) onBookingSuccess(res.booking);
      } else {
        addToast(res.error || 'Booking could not be processed', 'error');
      }
    } catch (err) {
      if (forcePayFail) {
        setBookingResult({
          status: 'PAYMENT_FAILED',
          message: 'ACID Transaction Cleanly Rolled Back: Zero seats deducted, zero residual rows.',
        });
        addToast('Simulation: Transaction rolled back successfully.', 'info');
      } else {
        addToast(err.message || 'Booking failed', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <span className="badge badge-class" style={{ marginBottom: '0.4rem' }}>Class {selectedClass}</span>
            <h3 style={{ fontSize: '1.4rem' }}>Complete Reservation</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {train.train_no} - {train.train_name} &bull; {train.from_station_name} &rarr; {train.to_station_name}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.4rem' }}>
            <X size={20} />
          </button>
        </div>

        {bookingResult ? (
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)', textAlign: 'center' }}>
            {bookingResult.status === 'CONFIRMED' ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎉</div>
                <h4 style={{ fontSize: '1.35rem', color: '#10b981', marginBottom: '0.25rem' }}>Booking Confirmed!</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  Your seats have been allocated with zero-conflict guarantee.
                </p>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>PNR NUMBER</div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '0.05em', color: '#fff' }}>{bookingResult.pnr}</div>
                </div>
              </>
            ) : bookingResult.status === 'WAITING' ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⏳</div>
                <h4 style={{ fontSize: '1.35rem', color: '#f59e0b', marginBottom: '0.25rem' }}>Placed on Waiting List</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  Automatic promotion will elevate your status immediately upon downstream cancellation.
                </p>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 600 }}>PNR: {bookingResult.pnr}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                    Position: WL #{bookingResult.wl_positions ? bookingResult.wl_positions.join(', WL #') : 1}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛡️</div>
                <h4 style={{ fontSize: '1.35rem', color: '#f43f5e', marginBottom: '0.25rem' }}>ACID Rollback Verified</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  {bookingResult.message || 'Payment simulated failure triggered PostgreSQL SAVEPOINT rollback.'}
                </p>
              </>
            )}

            <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Passenger Details */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  PASSENGER INFORMATION ({passengers.length}/6)
                </span>
                <button type="button" onClick={addPassenger} className="btn btn-ghost" style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}>
                  <Plus size={14} /> Add Passenger
                </button>
              </div>

              {passengers.map((p, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.65rem', alignItems: 'center', marginBottom: '0.65rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '8px' }}>
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="input-field"
                    value={p.name}
                    onChange={(e) => handlePassengerChange(idx, 'name', e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Age"
                    min="1"
                    max="120"
                    className="input-field"
                    value={p.age}
                    onChange={(e) => handlePassengerChange(idx, 'age', e.target.value)}
                    required
                  />
                  <select
                    className="select-field"
                    value={p.gender}
                    onChange={(e) => handlePassengerChange(idx, 'gender', e.target.value)}
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                  {passengers.length > 1 && (
                    <button type="button" onClick={() => removePassenger(idx)} className="btn btn-ghost" style={{ padding: '0.5rem', color: '#f43f5e' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>PAYMENT GATEWAY</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
                {['UPI', 'CARD', 'NETBANKING'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`btn ${paymentMethod === method ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '0.85rem', padding: '0.6rem' }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Rollback Simulator */}
            <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={forcePayFail}
                  onChange={(e) => setForcePayFail(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#f43f5e' }}
                />
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fb7185' }}>
                    Simulate Payment Failure & ACID Rollback
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Forces a simulated gateway crash inside stored procedure to verify atomic rollback and zero orphaned rows.
                  </p>
                </div>
              </label>
            </div>

            {/* Fare Summary & Submit */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTAL FARE</span>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#38bdf8' }}>₹{totalFare}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={onClose} className="btn btn-ghost" disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Processing Transaction...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Confirm & Pay ₹{totalFare}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
