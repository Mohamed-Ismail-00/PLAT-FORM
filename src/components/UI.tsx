import React from 'react';

export const Card: React.FC<{ children: React.ReactNode, className?: string, style?: React.CSSProperties }> = ({ children, className = '', style }) => {
  return (
    <div className={`card ${className}`} style={{ padding: '1.5rem', ...style }}>
      {children}
    </div>
  );
};

export const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, trend?: { value: number, isPositive: boolean } }> = ({ title, value, icon, trend }) => {
  return (
    <Card className="flex flex-col justify-between" style={{ height: '100%' }}>
      <div className="flex justify-between items-start" style={{ marginBottom: '1rem' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>{title}</p>
          <h3 style={{ color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: 700 }}>{value}</h3>
        </div>
        <div style={{ color: 'var(--secondary-color)', backgroundColor: 'rgba(0, 212, 170, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

export const ProgressBar: React.FC<{ value: number, color?: string, label?: string }> = ({ value, color = 'var(--secondary-color)', label }) => {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center" style={{ marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
          <span>{label}</span>
          <span>{value}%</span>
        </div>
      )}
      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, backgroundColor: color, borderRadius: '999px', transition: 'width 0.5s ease-in-out' }}></div>
      </div>
    </div>
  );
};
