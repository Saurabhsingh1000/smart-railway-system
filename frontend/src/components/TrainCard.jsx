import React, { useState } from 'react';
import { Clock, ArrowRight, LayoutGrid, CheckCircle } from 'lucide-react';

export default function TrainCard({ train, onOpenSeatMap, onBook }) {
  const [selectedClassIndex, setSelectedClassIndex] = useState(0);

  const availability = train.availability || [];
  const currentAvailability = availability[selectedClassIndex] || availability[0] || {};

  return (
    <div className="train-card glow-card">
      {/* Header */}
      <div className="train-header">
        <div className="train-title-group">
          <span className="train-no-badge">{train.train_no}</span>
          <div>
            <h4 style={{ fontSize: '1.15rem' }}>{train.train_name}</h4>
            <span style={{ fontSize: '0.75rem', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 600 }}>
              {train.train_type} EXPRESS
            </span>
          </div>
        </div>

        <button
          onClick={() => onOpenSeatMap(train, currentAvailability.class || '3A')}
          className="btn btn-ghost"
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
        >
          <LayoutGrid size={14} /> Live Seat Map
        </button>
      </div>

      {/* Timeline */}
      <div className="route-timeline">
        <div className="station-point">
          <span className="station-time">{train.departure_time ? train.departure_time.substring(0, 5) : '06:00'}</span>
          <span className="station-code">{train.from_station_code}</span>
          <span className="station-name">{train.from_station_name}</span>
        </div>

        <div className="route-divider">
          <span>{train.distance_km || 1384} km</span>
          <div className="route-line"></div>
          <span>Direct Route</span>
        </div>

        <div className="station-point right">
          <span className="station-time">{train.arrival_time ? train.arrival_time.substring(0, 5) : '18:30'}</span>
          <span className="station-code">{train.to_station_code}</span>
          <span className="station-name">{train.to_station_name}</span>
        </div>
      </div>

      {/* Classes Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem' }}>
        <div className="classes-grid" style={{ flex: 1 }}>
          {availability.map((avail, idx) => {
            const isSelected = idx === selectedClassIndex;
            const isAvailable = avail.free_seats > 0;

            return (
              <div
                key={avail.class || idx}
                onClick={() => setSelectedClassIndex(idx)}
                className={`class-tier-card ${isSelected ? 'selected' : ''}`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#a5b4fc' : 'var(--text-muted)' }}>
                    {avail.class}
                  </span>
                  <span className="class-fare">₹{avail.fare || 850}</span>
                </div>

                <div className="seat-status-pill">
                  {isAvailable ? (
                    <span style={{ color: '#10b981' }}>
                      AVL &bull; {avail.free_seats}
                    </span>
                  ) : (
                    <span style={{ color: '#f59e0b' }}>
                      WL #{avail.waiting_count + 1}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => onBook(train, currentAvailability.class || '3A', currentAvailability.fare || 850)}
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.75rem', minWidth: '150px' }}
        >
          Book {currentAvailability.class || '3A'} &bull; ₹{currentAvailability.fare || 850}
        </button>
      </div>
    </div>
  );
}
