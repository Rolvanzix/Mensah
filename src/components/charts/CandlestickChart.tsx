import React, { useMemo, useState } from 'react';
import { KlineCandle } from '../../types/practiceTrading';
import { formatUSD } from '../../services/strikeApi';

interface CandlestickChartProps {
  candles: KlineCandle[];
  symbol: string;
  currentPrice: number;
  openPositionEntryPrice?: number | null;
  exitPrice?: number | null;
  tradeSide?: 'long' | 'short' | null;
  tradeLabel?: string | null;
  stopLossPrice?: number | null;
  takeProfitPrice?: number | null;
  height?: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  symbol,
  currentPrice,
  openPositionEntryPrice,
  exitPrice,
  tradeSide,
  tradeLabel,
  stopLossPrice,
  takeProfitPrice,
  height = 360,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { minPrice, maxPrice, maxVolume, priceRange } = useMemo(() => {
    if (candles.length === 0) {
      return { minPrice: 0, maxPrice: 100, maxVolume: 10, priceRange: 100 };
    }

    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    candles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    if (openPositionEntryPrice) {
      min = Math.min(min, openPositionEntryPrice);
      max = Math.max(max, openPositionEntryPrice);
    }
    if (exitPrice) {
      min = Math.min(min, exitPrice);
      max = Math.max(max, exitPrice);
    }
    if (stopLossPrice) {
      min = Math.min(min, stopLossPrice);
      max = Math.max(max, stopLossPrice);
    }
    if (takeProfitPrice) {
      min = Math.min(min, takeProfitPrice);
      max = Math.max(max, takeProfitPrice);
    }

    // Add 2% padding above and below
    const padding = (max - min) * 0.04 || 1;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      maxVolume: maxVol || 1,
      priceRange: max - min + padding * 2,
    };
  }, [candles, openPositionEntryPrice, stopLossPrice, takeProfitPrice]);

  const chartWidth = 720;
  const paddingRight = 65; // Price axis space
  const paddingBottom = 28; // Time axis space
  const usableWidth = chartWidth - paddingRight;
  const usableHeight = height - paddingBottom;
  const volumeHeight = 55;
  const priceChartHeight = usableHeight - volumeHeight - 15;

  const getPriceY = (price: number) => {
    if (priceRange <= 0) return priceChartHeight / 2;
    const norm = (price - minPrice) / priceRange;
    return priceChartHeight - norm * priceChartHeight;
  };

  const candleWidth = useMemo(() => {
    if (candles.length === 0) return 6;
    return Math.max(4, Math.min(18, (usableWidth / candles.length) * 0.7));
  }, [candles.length, usableWidth]);

  const activeCandle = hoveredIndex !== null ? candles[hoveredIndex] : candles[candles.length - 1];

  // Grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    const count = 5;
    for (let i = 0; i <= count; i++) {
      const price = minPrice + (priceRange / count) * i;
      const y = getPriceY(price);
      lines.push({ price, y });
    }
    return lines;
  }, [minPrice, priceRange, priceChartHeight]);

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col">
      {/* Top Header: Candle Inspection Details */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 text-sm">{symbol}</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold">
            Live Market
          </span>
          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
            Strike Price Engine
          </span>
        </div>

        {activeCandle && (
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <div>
              <span className="text-slate-400">O: </span>
              <span className="font-semibold text-slate-800">{formatUSD(activeCandle.open)}</span>
            </div>
            <div>
              <span className="text-slate-400">H: </span>
              <span className="font-semibold text-emerald-600">{formatUSD(activeCandle.high)}</span>
            </div>
            <div>
              <span className="text-slate-400">L: </span>
              <span className="font-semibold text-rose-600">{formatUSD(activeCandle.low)}</span>
            </div>
            <div>
              <span className="text-slate-400">C: </span>
              <span
                className={`font-bold ${
                  activeCandle.close >= activeCandle.open ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatUSD(activeCandle.close)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="w-full h-full select-none"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Background Grid */}
          {gridLines.map((line, idx) => (
            <g key={idx}>
              <line
                x1="0"
                y1={line.y}
                x2={usableWidth}
                y2={line.y}
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={usableWidth + 8}
                y={line.y + 3.5}
                fill="#94a3b8"
                fontSize="10"
                fontFamily="monospace"
              >
                ${line.price >= 1000 ? line.price.toFixed(0) : line.price.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Volume Baseline Grid */}
          <line
            x1="0"
            y1={usableHeight - volumeHeight}
            x2={usableWidth}
            y2={usableHeight - volumeHeight}
            stroke="#e2e8f0"
            strokeWidth="1"
          />

          {/* Candlesticks & Volume Bars */}
          {candles.map((candle, idx) => {
            const x = (usableWidth / candles.length) * (idx + 0.5);
            const isBullish = candle.close >= candle.open;
            const candleColor = isBullish ? '#059669' : '#e11d48';

            const openY = getPriceY(candle.open);
            const closeY = getPriceY(candle.close);
            const highY = getPriceY(candle.high);
            const lowY = getPriceY(candle.low);

            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));

            // Volume bar
            const volNorm = candle.volume / maxVolume;
            const volBarHeight = Math.max(2, volNorm * volumeHeight);
            const volY = usableHeight - volBarHeight;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                className="cursor-crosshair"
              >
                {/* Volume bar */}
                <rect
                  x={x - candleWidth / 2}
                  y={volY}
                  width={candleWidth}
                  height={volBarHeight}
                  fill={isBullish ? '#059669' : '#e11d48'}
                  opacity={hoveredIndex === idx ? 0.6 : 0.25}
                />

                {/* High/Low Wick */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={candleColor}
                  strokeWidth="1.2"
                />

                {/* Open/Close Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyY}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isBullish ? '#059669' : '#e11d48'}
                  rx="1"
                />

                {/* Interactive invisible hit area */}
                <rect
                  x={x - (usableWidth / candles.length) / 2}
                  y="0"
                  width={usableWidth / candles.length}
                  height={height}
                  fill="transparent"
                />
              </g>
            );
          })}

          {/* Current Live Price Line */}
          {currentPrice > 0 && (
            <g>
              <line
                x1="0"
                y1={getPriceY(currentPrice)}
                x2={usableWidth}
                y2={getPriceY(currentPrice)}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <rect
                x={usableWidth + 4}
                y={getPriceY(currentPrice) - 8}
                width="56"
                height="16"
                rx="4"
                fill="#10b981"
              />
              <text
                x={usableWidth + 7}
                y={getPriceY(currentPrice) + 4}
                fill="#ffffff"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                ${currentPrice >= 1000 ? currentPrice.toFixed(1) : currentPrice.toFixed(2)}
              </text>
            </g>
          )}

          {/* Open Position Overlay Lines */}
          {openPositionEntryPrice && (
            <g>
              <line
                x1="0"
                y1={getPriceY(openPositionEntryPrice)}
                x2={usableWidth}
                y2={getPriceY(openPositionEntryPrice)}
                stroke="#059669"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x="8"
                y={getPriceY(openPositionEntryPrice) - 4}
                fill="#059669"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {tradeLabel || `Simulated Entry (${tradeSide?.toUpperCase() || 'TRADE'}): $${openPositionEntryPrice.toFixed(2)}`}
              </text>
            </g>
          )}

          {/* Trade Exit Line */}
          {exitPrice && (
            <g>
              <line
                x1="0"
                y1={getPriceY(exitPrice)}
                x2={usableWidth}
                y2={getPriceY(exitPrice)}
                stroke="#64748b"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              <text
                x="8"
                y={getPriceY(exitPrice) - 4}
                fill="#475569"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Exit / Close Price: ${exitPrice.toFixed(2)}
              </text>
            </g>
          )}

          {/* Stop Loss Line */}
          {stopLossPrice && (
            <g>
              <line
                x1="0"
                y1={getPriceY(stopLossPrice)}
                x2={usableWidth}
                y2={getPriceY(stopLossPrice)}
                stroke="#e11d48"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              <text
                x="8"
                y={getPriceY(stopLossPrice) - 4}
                fill="#e11d48"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Stop Loss: ${stopLossPrice.toFixed(2)}
              </text>
            </g>
          )}

          {/* Take Profit Line */}
          {takeProfitPrice && (
            <g>
              <line
                x1="0"
                y1={getPriceY(takeProfitPrice)}
                x2={usableWidth}
                y2={getPriceY(takeProfitPrice)}
                stroke="#059669"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              <text
                x="8"
                y={getPriceY(takeProfitPrice) - 4}
                fill="#059669"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Take Profit: ${takeProfitPrice.toFixed(2)}
              </text>
            </g>
          )}

          {/* Hover Crosshair */}
          {hoveredIndex !== null && candles[hoveredIndex] && (
            <g>
              <line
                x1={(usableWidth / candles.length) * (hoveredIndex + 0.5)}
                y1="0"
                x2={(usableWidth / candles.length) * (hoveredIndex + 0.5)}
                y2={usableHeight}
                stroke="#64748b"
                strokeWidth="0.8"
                strokeDasharray="2 2"
              />
              {/* Date tooltip */}
              <text
                x={(usableWidth / candles.length) * (hoveredIndex + 0.5)}
                y={height - 6}
                textAnchor="middle"
                fill="#64748b"
                fontSize="9.5"
                fontFamily="monospace"
              >
                {new Date(candles[hoveredIndex].time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
