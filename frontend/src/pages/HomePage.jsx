import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import TrainCard from '../components/TrainCard';
import SeatMapModal from '../components/SeatMapModal';
import BookingModal from '../components/BookingModal';
import { Search, Calendar, MapPin, Sparkles, ShieldCheck, Zap, Activity, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { addToast } = useAuth();

  const [stations, setStations] = useState([]);
  const [fromStation, setFromStation] = useState('NDLS');
  const [toStation, setToStation] = useState('MMCT');
  const [journeyDate, setJourneyDate] = useState('2026-10-25');
  const [travelClass, setTravelClass] = useState('');

  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Modals state
  const [seatMapTrain, setSeatMapTrain] = useState(null);
  const [seatMapClass, setSeatMapClass] = useState('3A');
  const [bookingTrain, setBookingTrain] = useState(null);
  const [bookingClass, setBookingClass] = useState('3A');
  const [bookingFare, setBookingFare] = useState(0);

  useEffect(() => {
    api.getStations()
      .then((res) => {
        if (res.stations) setStations(res.stations);
      })
      .catch((err) => console.error('Failed to load stations', err));

    // Auto trigger initial search
    handleSearch();
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (fromStation === toStation) {
      addToast('Source and destination stations must be different.', 'error');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await api.searchTrains(fromStation, toStation, journeyDate, travelClass);
      if (res.success) {
        setTrains(res.results || []);
      }
    } catch (err) {
      addToast(err.message || 'Train search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSeatMap = (train, cls) => {
    setSeatMapTrain(train);
    setSeatMapClass(cls);
  };

  const handleBook = (train, cls, fare) => {
    setBookingTrain(train);
    setBookingClass(cls);
    setBookingFare(fare);
  };

  return (
    <div className="main-content">
      {/* Hero Section */}
      <div className="hero-banner">
        <div className="hero-pill">
          <Sparkles size={14} color="#818cf8" />
          <span>High-Concurrency ACID Booking Engine &bull; Zero Double-Bookings</span>
        </div>
        <h1 className="hero-title">
          Smart Railway Reservation <br />
          <span style={{ background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Built for Extreme Concurrency
          </span>
        </h1>
        <p className="hero-subtitle">
          Engineered with PostgreSQL 16 Repeatable Read Isolation, row-level pessimistic locking (`SELECT ... FOR UPDATE`), and atomic automatic waitlist FIFO promotion.
        </p>

        {/* Feature Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8' }}>
            <ShieldCheck size={18} /> Row-Level Lock Isolation
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981' }}>
            <Zap size={18} /> Sub-50ms Transaction Latency
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b' }}>
            <Activity size={18} /> Automatic Waitlist Promotion
          </div>
        </div>
      </div>

      {/* Search Bar Container */}
      <div className="search-card">
        <form onSubmit={handleSearch} className="search-grid">
          <div className="input-group">
            <label className="input-label">
              <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              FROM STATION
            </label>
            <select
              className="select-field"
              value={fromStation}
              onChange={(e) => setFromStation(e.target.value)}
            >
              {stations.map((s) => (
                <option key={s.station_id} value={s.code}>
                  {s.city} ({s.code}) - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">
              <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              TO STATION
            </label>
            <select
              className="select-field"
              value={toStation}
              onChange={(e) => setToStation(e.target.value)}
            >
              {stations.map((s) => (
                <option key={s.station_id} value={s.code}>
                  {s.city} ({s.code}) - {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">
              <Calendar size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              JOURNEY DATE
            </label>
            <input
              type="date"
              className="input-field"
              value={journeyDate}
              onChange={(e) => setJourneyDate(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">ALL CLASSES</label>
            <select
              className="select-field"
              value={travelClass}
              onChange={(e) => setTravelClass(e.target.value)}
            >
              <option value="">All Travel Classes</option>
              <option value="SL">Sleeper (SL)</option>
              <option value="3A">AC 3 Tier (3A)</option>
              <option value="2A">AC 2 Tier (2A)</option>
            </select>
          </div>

          <div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '44px' }} disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              Search Trains
            </button>
          </div>
        </form>
      </div>

      {/* Search Results */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.35rem' }}>
            Available Trains {searched && `(${trains.length} Direct Schedules Found)`}
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Real-time PostgreSQL Seat Inventory
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ color: 'var(--text-muted)' }}>Querying normalized 3NF railway database index...</p>
          </div>
        ) : trains.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
            <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No direct trains found for this route and date</h4>
            <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
              Try searching between high-frequency hubs like <strong>NDLS</strong> (New Delhi) and <strong>MMCT</strong> (Mumbai Central) or <strong>LKO</strong> (Lucknow) for date <strong>2026-10-25</strong>.
            </p>
            <button
              onClick={() => {
                setFromStation('NDLS');
                setToStation('MMCT');
                setJourneyDate('2026-10-25');
              }}
              className="btn btn-cyan"
            >
              Load Flagship NDLS &rarr; MMCT Route
            </button>
          </div>
        ) : (
          trains.map((train) => (
            <TrainCard
              key={train.schedule_id}
              train={train}
              onOpenSeatMap={handleOpenSeatMap}
              onBook={handleBook}
            />
          ))
        )}
      </div>

      {/* Seat Map Modal */}
      {seatMapTrain && (
        <SeatMapModal
          scheduleId={seatMapTrain.schedule_id}
          trainNo={seatMapTrain.train_no}
          trainName={seatMapTrain.train_name}
          initialClass={seatMapClass}
          onClose={() => setSeatMapTrain(null)}
        />
      )}

      {/* Booking Modal */}
      {bookingTrain && (
        <BookingModal
          train={bookingTrain}
          scheduleId={bookingTrain.schedule_id}
          selectedClass={bookingClass}
          fare={bookingFare}
          fromStationId={bookingTrain.from_station_id}
          toStationId={bookingTrain.to_station_id}
          onClose={() => setBookingTrain(null)}
          onBookingSuccess={() => handleSearch()}
        />
      )}
    </div>
  );
}
