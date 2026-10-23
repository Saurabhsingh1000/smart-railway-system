import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, TrendingUp, DollarSign, Users, CheckCircle, XCircle, Clock, Train, Plus, Loader2 } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, addToast } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // New Train Form State
  const [showAddTrain, setShowAddTrain] = useState(false);
  const [newTrainNo, setNewTrainNo] = useState('');
  const [newTrainName, setNewTrainName] = useState('');
  const [newTrainType, setNewTrainType] = useState('SUPERFAST');
  const [submittingTrain, setSubmittingTrain] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      addToast(err.message || 'Error fetching admin metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrain = async (e) => {
    e.preventDefault();
    setSubmittingTrain(true);
    try {
      const res = await api.createTrain({
        train_no: newTrainNo.trim(),
        name: newTrainName.trim(),
        type: newTrainType,
      });
      if (res.success) {
        addToast(`Train ${newTrainNo} created successfully!`, 'success');
        setNewTrainNo('');
        setNewTrainName('');
        setShowAddTrain(false);
        loadStats();
      }
    } catch (err) {
      addToast(err.message || 'Failed to create train', 'error');
    } finally {
      setSubmittingTrain(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="main-content" style={{ textAlign: 'center', padding: '5rem 1.5rem' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem' }}>
          <ShieldAlert size={48} color="#f43f5e" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            This portal is restricted to System Administrators. Please log in with admin credentials.
          </p>
        </div>
      </div>
    );
  }

  const kpi = stats?.kpi || {};
  const trends = stats?.trends || [];
  const occupancies = stats?.trainOccupancy || [];

  return (
    <div className="main-content">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '2.25rem' }}>Admin Control Center</h1>
            <span className="badge badge-class">RESTRICTED</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Live analytical views, seat inventory occupancy, and revenue streams
          </p>
        </div>

        <button
          onClick={() => setShowAddTrain(!showAddTrain)}
          className="btn btn-primary"
        >
          <Plus size={16} /> {showAddTrain ? 'Close Form' : 'Add New Train'}
        </button>
      </div>

      {/* New Train Form Modal / Panel */}
      {showAddTrain && (
        <div className="glass-panel glow-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Register New Train Master Record</h3>
          <form onSubmit={handleCreateTrain} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="input-group">
              <label className="input-label">TRAIN NUMBER</label>
              <input
                type="text"
                placeholder="e.g. 12005"
                className="input-field"
                value={newTrainNo}
                onChange={(e) => setNewTrainNo(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">TRAIN NAME</label>
              <input
                type="text"
                placeholder="e.g. Kalka Shatabdi Express"
                className="input-field"
                value={newTrainName}
                onChange={(e) => setNewTrainName(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">TRAIN TYPE</label>
              <select
                className="select-field"
                value={newTrainType}
                onChange={(e) => setNewTrainType(e.target.value)}
              >
                <option value="SUPERFAST">SUPERFAST</option>
                <option value="RAJDHANI">RAJDHANI</option>
                <option value="SHATABDI">SHATABDI</option>
                <option value="VANDE_BHARAT">VANDE BHARAT</option>
                <option value="EXPRESS">EXPRESS</option>
              </select>
            </div>
            <div>
              <button type="submit" className="btn btn-cyan" style={{ width: '100%' }} disabled={submittingTrain}>
                {submittingTrain ? <Loader2 size={16} className="animate-spin" /> : <Train size={16} />}
                Save Train
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ color: 'var(--text-muted)' }}>Aggregating system telemetry from database view v_admin_stats...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span>TOTAL REVENUE</span>
                <DollarSign size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#10b981' }}>
                ₹{Number(kpi.total_revenue || 0).toLocaleString()}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>From confirmed booking payments</span>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span>TOTAL BOOKINGS</span>
                <Users size={18} color="#38bdf8" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#38bdf8' }}>
                {kpi.total_bookings || 0}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Across all train schedules</span>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span>CONFIRMED TICKETS</span>
                <CheckCircle size={18} color="#34d399" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34d399' }}>
                {kpi.confirmed_bookings || 0}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Active confirmed passenger berths</span>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span>WAITLIST QUEUE</span>
                <Clock size={18} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#f59e0b' }}>
                {kpi.waitlisted_passengers || 0}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>Waiting for cancellation promotion</span>
            </div>
          </div>

          {/* Train Fleet Occupancy & Daily Trends */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            {/* Fleet Occupancy Progress */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Fleet Capacity & Occupancy</h3>
              {occupancies.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No occupancy records found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {occupancies.map((train) => {
                    const pct = parseFloat(train.occupancy_pct || 0);
                    return (
                      <div key={train.train_no}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 600 }}>{train.train_no} - {train.train_name}</span>
                          <span style={{ color: pct > 80 ? '#f43f5e' : pct > 50 ? '#f59e0b' : '#38bdf8', fontWeight: 700 }}>
                            {pct}% ({train.booked_seats}/{train.total_seats})
                          </span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              height: '100%',
                              background: pct > 80 ? 'var(--rose-gradient)' : pct > 50 ? 'var(--amber-gradient)' : 'var(--cyan-gradient)',
                              borderRadius: '4px',
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Daily Trends Table */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Daily Booking Trends</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Bookings</th>
                      <th>Confirmed</th>
                      <th>Cancelled</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          No trend entries yet.
                        </td>
                      </tr>
                    ) : (
                      trends.map((t, idx) => (
                        <tr key={idx}>
                          <td className="mono" style={{ fontSize: '0.85rem' }}>
                            {new Date(t.booking_date).toLocaleDateString()}
                          </td>
                          <td style={{ fontWeight: 600 }}>{t.total_bookings}</td>
                          <td><span style={{ color: '#10b981' }}>{t.confirmed}</span></td>
                          <td><span style={{ color: '#f43f5e' }}>{t.cancelled}</span></td>
                          <td style={{ fontWeight: 700, color: '#38bdf8' }}>₹{t.revenue || 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
