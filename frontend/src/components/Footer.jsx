import React from 'react';
import { Database, ShieldCheck, Zap, GitBranch } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border-glass)', background: 'rgba(5, 7, 11, 0.9)', padding: '2.5rem 1.5rem', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>RailStream Engine</span>
            <span className="pulse-indicator"></span>
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>PostgreSQL 16 High-Concurrency Active</span>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            Enterprise Relational DBMS Architecture &bull; Repeatable Read Isolation &bull; Row-Level Pessimistic Locking &bull; Automatic Waitlist Promotion
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Database size={15} color="#38bdf8" /> 3NF Normalized Schema
          </span>
          <span>&bull;</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={15} color="#10b981" /> ACID Certified
          </span>
          <span>&bull;</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Zap size={15} color="#f59e0b" /> Zero Double-Booking Guarantee
          </span>
        </div>
      </div>
    </footer>
  );
}
