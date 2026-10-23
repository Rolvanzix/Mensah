import React from 'react';

interface RiskBarGaugeProps {
  drawdownPct: number;
  showDetails?: boolean;
}

export const RiskBarGauge: React.FC<RiskBarGaugeProps> = ({
  drawdownPct,
  showDetails = true,
}) => {
  const safeDd = Math.max(0, drawdownPct);
  // Max cap visualization at 50% for standardizing the bar scale
  const barWidth = Math.min(100, (safeDd / 40) * 100);

  let statusLabel = 'Conservative';
  let barColor = 'bg-[#00f29d]';
  let textColor = 'text-[#00f29d]';

  if (safeDd > 22) {
    statusLabel = 'High Drawdown';
    barColor = 'bg-rose-500';
    textColor = 'text-rose-400';
  } else if (safeDd > 12) {
    statusLabel = 'Moderate';
    barColor = 'bg-amber-400';
    textColor = 'text-amber-400';
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-slate-400 font-medium">30D Max DD</span>
        <div className="flex items-center gap-1.5 font-sans">
          <span className="font-semibold text-slate-200 tabular-nums">
            -{safeDd.toFixed(1)}%
          </span>
          {showDetails && (
            <span className={`text-[11px] font-medium ${textColor}`}>
              · {statusLabel}
            </span>
          )}
        </div>
      </div>

      {/* Visual Graphical Bar Track */}
      <div className="w-full h-1.5 bg-[#1c2436] rounded-full overflow-hidden flex">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
};
