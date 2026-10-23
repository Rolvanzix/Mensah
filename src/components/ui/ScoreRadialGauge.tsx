import React from 'react';

interface ScoreRadialGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}

export const ScoreRadialGauge: React.FC<ScoreRadialGaugeProps> = ({
  score,
  size = 44,
  strokeWidth = 3.5,
  showLabel = false,
}) => {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedScore / 100) * circumference;

  // Determine color based on Strike Score tiers
  let color = '#00f29d'; // Strike Mint for Elite (75+)
  let glowColor = 'rgba(0, 242, 157, 0.25)';

  if (normalizedScore < 40) {
    color = '#f43f5e'; // Rose
    glowColor = 'rgba(244, 63, 94, 0.25)';
  } else if (normalizedScore < 60) {
    color = '#f59e0b'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.25)';
  } else if (normalizedScore < 75) {
    color = '#38bdf8'; // Cyan
    glowColor = 'rgba(56, 189, 248, 0.25)';
  }

  return (
    <div className="flex flex-col items-center justify-center shrink-0" title={`Strike Score: ${normalizedScore}/100`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1c2436"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 0.6s ease',
              filter: `drop-shadow(0 0 3px ${glowColor})`,
            }}
          />
        </svg>

        {/* Centered Number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="font-bold text-white tracking-tight tabular-nums"
            style={{ fontSize: size * 0.34 }}
          >
            {normalizedScore}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
          Score
        </span>
      )}
    </div>
  );
};
