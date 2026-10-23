import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { X, Layers, Users, Info, Loader2 } from 'lucide-react';

export default function SeatMapModal({ scheduleId, trainNo, trainName, initialClass = '3A', onClose }) {
  const [travelClass, setTravelClass] = useState(initialClass);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoach, setSelectedCoach] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.getSeatMap(scheduleId, travelClass)
      .then((res) => {
        if (isMounted) {
          const fetchedSeats = res.seats || [];
          setSeats(fetchedSeats);
          // Auto select first coach
          const coaches = [...new Set(fetchedSeats.map((s) => s.coach_no))];
          setSelectedCoach(coaches[0] || null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [scheduleId, travelClass]);

  const coaches = [...new Set(seats.map((s) => s.coach_no))];
  const filteredSeats = selectedCoach ? seats.filter((s) => s.coach_no === selectedCoach) : seats;
  const freeCount = seats.filter((s) => s.status === 'FREE').length;
  const bookedCount = seats.filter((s) => s.status === 'BOOKED').length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="train-no-badge">{trainNo}</span>
              <h3 style={{ fontSize: '1.35rem' }}>{trainName} &bull; Live Seat Layout</h3>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Real-time snapshot of row-level seat inventory and berth designations
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.4rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Class Selection Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {['SL', '3A', '2A'].map((cls) => (
            <button
              key={cls}
              onClick={() => setTravelClass(cls)}
              className={`btn ${travelClass === cls ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            >
              Class {cls}
            </button>
          ))}
        </div>

        {/* Status Bar */}
        <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          <div className="legend-item">
            <span className="legend-swatch swatch-free"></span>
            <span>Available: <strong style={{ color: '#38bdf8' }}>{freeCount}</strong></span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch swatch-booked"></span>
            <span>Occupied: <strong style={{ color: '#94a3b8' }}>{bookedCount}</strong></span>
          </div>
          <div className="legend-item" style={{ marginLeft: 'auto' }}>
            <Info size={14} color="#6366f1" />
            <span style={{ color: 'var(--text-subtle)' }}>Pessimistic Lock on Checkout</span>
          </div>
        </div>

        {/* Coach Tabs */}
        {coaches.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {coaches.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCoach(c)}
                className={`btn ${selectedCoach === c ? 'btn-cyan' : 'btn-ghost'}`}
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', borderRadius: '6px' }}
              >
                <Layers size={14} /> Coach {c}
              </button>
            ))}
          </div>
        )}

        {/* Seat Map Visual Area */}
        <div className="seat-map-wrapper">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 0.75rem', display: 'block', animation: 'spin 1s linear infinite' }} />
              Loading real-time seat matrix...
            </div>
          ) : filteredSeats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
              No coaches configured for class {travelClass} on this train.
            </div>
          ) : (
            <div className="seat-grid">
              {filteredSeats.map((s) => {
                const isFree = s.status === 'FREE';
                return (
                  <div
                    key={s.seat_id}
                    className={`seat-item ${isFree ? 'free' : 'booked'}`}
                    title={`Coach ${s.coach_no} | Seat ${s.seat_no} (${s.berth_type || 'Berth'}) - ${s.status}`}
                  >
                    <span>{s.seat_no}</span>
                    <span className="seat-sub">{s.berth_type?.substring(0, 2) || 'B'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-ghost">
            Close Layout
          </button>
        </div>
      </div>
    </div>
  );
}
