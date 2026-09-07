'use client';

import { useMemo, useState } from 'react';

export function RatingChart({ points }: { points: { date?: string; label: string; rating: number }[] }) {
  const [range, setRange] = useState('30D');
  const visiblePoints = useMemo(() => {
    if (range === 'ALL') return points;
    const days = Number.parseInt(range, 10);
    const cutoff = Date.now() - days * 86_400_000;
    const dated = points.filter((point) => point.date && new Date(point.date).getTime() >= cutoff);
    return dated.length ? dated : points.filter((point) => !point.date);
  }, [points, range]);
  const path = useMemo(() => {
    if (visiblePoints.length < 2) return '';
    const min = Math.min(...visiblePoints.map((p) => p.rating)) - 20;
    const max = Math.max(...visiblePoints.map((p) => p.rating)) + 20;
    return visiblePoints.map((point, index) => {
      const x = 24 + (index / (visiblePoints.length - 1)) * 752;
      const y = 180 - ((point.rating - min) / (max - min)) * 140;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [visiblePoints]);

  return (
    <div className="chart-card card">
      <div className="section-heading"><div><span className="eyebrow">Performance</span><h2>Rating history</h2></div><div className="period-tabs">{['7D', '30D', '90D', 'ALL'].map((item) => <button key={item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item}</button>)}</div></div>
      {visiblePoints.length > 1 ? <div className="chart-area" role="img" aria-label={`Rating history for ${range.toLowerCase()}`}>
        <svg viewBox="0 0 800 220" preserveAspectRatio="none">
          <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--gold)" stopOpacity=".24" /><stop offset="1" stopColor="var(--gold)" stopOpacity="0" /></linearGradient></defs>
          {[40, 80, 120, 160].map((y) => <line key={y} x1="24" x2="776" y1={y} y2={y} className="chart-grid" />)}
          <path d={`${path} L 776 200 L 24 200 Z`} fill="url(#chart-fill)" />
          <path d={path} className="chart-line" />
        </svg>
        <div className="chart-labels"><span>{visiblePoints[0]?.label}</span><span>{visiblePoints[Math.floor(visiblePoints.length / 2)]?.label}</span><span>{visiblePoints.at(-1)?.label}</span></div>
      </div> : <div className="chart-empty">No rating changes in this period.</div>}
    </div>
  );
}
