import React, { useMemo, useState } from 'react';
import { formatUSD } from '../services/strikeApi';

interface SparklineProps {
  data: [number, string][];
  width?: number;
  height?: number;
  isPositive?: boolean;
  interactive?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 160,
  height = 42,
  isPositive = true,
  interactive = true,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const parsedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .map(([ts, val]) => ({
        timestamp: ts,
        value: parseFloat(val) || 0,
      }))
      .filter((d) => !isNaN(d.value));
  }, [data]);

  const { pathD, areaD, minVal, maxVal, points } = useMemo(() => {
    if (parsedData.length < 2) {
      return { pathD: '', areaD: '', minVal: 0, maxVal: 0, points: [] };
    }

    const values = parsedData.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const paddingY = 4;
    const drawHeight = height - paddingY * 2;

    const pts = parsedData.map((d, index) => {
      const x = (index / (parsedData.length - 1)) * width;
      const y = height - paddingY - ((d.value - min) / range) * drawHeight;
      return { x, y, ...d };
    });

    const path = pts.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');
    const area = `${path} L ${width} ${height} L 0 ${height} Z`;

    return { pathD: path, areaD: area, minVal: min, maxVal: max, points: pts };
  }, [parsedData, width, height]);

  if (parsedData.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs text-slate-500 font-mono h-10 w-full">
        No curve
      </div>
    );
  }

  const strokeColor = isPositive ? '#10B981' : '#F43F5E';
  const gradientId = `spark-grad-${Math.random().toString(36).substring(2, 8)}`;

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div
      className="relative flex items-center justify-center group"
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible w-full h-full select-none"
        onMouseMove={(e) => {
          if (!interactive) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, mouseX / rect.width));
          const idx = Math.round(ratio * (points.length - 1));
          setHoverIndex(idx);
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        <path d={areaD} fill={`url(#${gradientId})`} />
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hoveredPoint && (
          <g>
            <line
              x1={hoveredPoint.x}
              y1={0}
              x2={hoveredPoint.x}
              y2={height}
              stroke="#64748B"
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.8"
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r="3.5"
              fill={strokeColor}
              stroke="#0F172A"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {hoveredPoint && interactive && (
        <div
          className="pointer-events-none absolute -top-8 z-30 bg-slate-900 border border-slate-700/80 text-[11px] font-mono text-slate-200 px-2 py-0.5 rounded shadow-lg whitespace-nowrap transform -translate-x-1/2"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
          }}
        >
          {formatUSD(hoveredPoint.value, true)}
        </div>
      )}
    </div>
  );
};
