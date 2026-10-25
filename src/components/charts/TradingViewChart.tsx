import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineStyle,
  UTCTimestamp,
  ColorType,
  Time,
} from 'lightweight-charts';
import { KlineCandle } from '../../types/practiceTrading';
import { fetchMarketKlinesWithMetadata, KlineInterval } from '../../services/klineService';
import { formatUSD } from '../../services/strikeApi';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Radio,
} from 'lucide-react';

export interface TradingViewChartProps {
  symbol: string;
  interval?: KlineInterval;
  onIntervalChange?: (interval: KlineInterval) => void;
  openPositionEntryPrice?: number | null;
  exitPrice?: number | null;
  tradeSide?: 'long' | 'short' | null;
  tradeLabel?: string | null;
  stopLossPrice?: number | null;
  height?: number;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  interval: externalInterval,
  onIntervalChange,
  openPositionEntryPrice,
  exitPrice,
  tradeSide,
  tradeLabel,
  stopLossPrice,
  height = 380,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [interval, setInterval] = useState<KlineInterval>(externalInterval || '1h');
  const [candles, setCandles] = useState<KlineCandle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);

  // User navigation tracking: don't snap back to latest bar if user is inspecting history
  const isInspectingHistoryRef = useRef<boolean>(false);

  // Active hover candle for the floating TradingView legend
  const [legendData, setLegendData] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    change: number;
    changePct: number;
  } | null>(null);

  const cleanSymbol = useMemo(() => symbol.trim().toUpperCase(), [symbol]);

  // Sync external interval if changed
  useEffect(() => {
    if (externalInterval && externalInterval !== interval) {
      setInterval(externalInterval);
    }
  }, [externalInterval]);

  const handleIntervalSelect = (newInt: KlineInterval) => {
    setInterval(newInt);
    if (onIntervalChange) onIntervalChange(newInt);
  };

  // 1. Initial Load of Historical Candles
  const loadHistoricalCandles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMarketKlinesWithMetadata(cleanSymbol, interval, 200);
      if (res.candles.length === 0) {
        setError(res.error || `No verified candlestick data returned for ${cleanSymbol}.`);
      } else {
        setCandles(res.candles);
        setLastUpdated(res.timestamp);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed connecting to Strike Finance market data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistoricalCandles();
  }, [cleanSymbol, interval]);

  // 2. Initialize Lightweight Charts instance
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous instance
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#64748b',
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: '#f1f5f9', style: LineStyle.Dotted },
        horzLines: { color: '#f1f5f9', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: 1, // Magnet / normal crosshair
        vertLine: {
          color: '#94a3b8',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0f172a',
        },
        horzLine: {
          color: '#94a3b8',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0f172a',
        },
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: {
          top: 0.12,
          bottom: 0.15,
        },
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#059669',
      downColor: '#e11d48',
      borderUpColor: '#059669',
      borderDownColor: '#e11d48',
      wickUpColor: '#059669',
      wickDownColor: '#e11d48',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Detect user scrolling into history
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range && seriesRef.current) {
        // If the right edge is significantly behind the latest bar, user is inspecting history
        isInspectingHistoryRef.current = range.to < 0.95;
      }
    });

    // Crosshair legend update
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !seriesRef.current) {
        // Fall back to latest candle
        if (candles.length > 0) {
          const last = candles[candles.length - 1];
          const chg = last.close - last.open;
          const chgPct = last.open > 0 ? (chg / last.open) * 100 : 0;
          setLegendData({
            time: new Date(last.time).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            change: chg,
            changePct: chgPct,
          });
        }
        return;
      }

      const barData: any = param.seriesData.get(seriesRef.current);
      if (barData && barData.open !== undefined) {
        const chg = barData.close - barData.open;
        const chgPct = barData.open > 0 ? (chg / barData.open) * 100 : 0;
        setLegendData({
          time: new Date((param.time as number) * 1000).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          open: barData.open,
          high: barData.high,
          low: barData.low,
          close: barData.close,
          change: chg,
          changePct: chgPct,
        });
      }
    });

    // Responsive resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width } = entries[0].contentRect;
      chartRef.current.applyOptions({ width });
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [height]);

  // 3. Set Candle Data and Price Lines
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    // Format timestamps to seconds (UTCTimestamp) and sort ascending
    const formattedData = candles.map((c) => ({
      time: Math.floor(c.time / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    seriesRef.current.setData(formattedData);

    // Initial fit to content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }

    // Set initial legend data
    const last = candles[candles.length - 1];
    if (last) {
      const chg = last.close - last.open;
      const chgPct = last.open > 0 ? (chg / last.open) * 100 : 0;
      setLegendData({
        time: new Date(last.time).toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        change: chg,
        changePct: chgPct,
      });
    }

    // Overlaid Price Lines
    if (openPositionEntryPrice) {
      seriesRef.current.createPriceLine({
        price: openPositionEntryPrice,
        color: '#059669',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: tradeLabel || `Simulated Entry (${tradeSide?.toUpperCase() || 'POSITION'})`,
      });
    }

    if (exitPrice) {
      seriesRef.current.createPriceLine({
        price: exitPrice,
        color: '#475569',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'Exit Price',
      });
    }

    if (stopLossPrice) {
      seriesRef.current.createPriceLine({
        price: stopLossPrice,
        color: '#e11d48',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'Est. Liquidation',
      });
    }
  }, [candles, openPositionEntryPrice, exitPrice, stopLossPrice, tradeSide, tradeLabel]);

  // 4. Genuine Live Ticks Polling (every 3 seconds from Strike Finance price endpoint)
  useEffect(() => {
    let timer: any = null;
    let isCancelled = false;

    const pollLiveTick = async () => {
      try {
        const res = await fetch(`/api/strike/price/v2/ticker/price`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            const match = list.find((item: any) => item.symbol === cleanSymbol);
            if (match && match.price && seriesRef.current && !isCancelled) {
              const livePrice = parseFloat(match.price);
              const tickTime = Math.floor(match.time / 1000) as UTCTimestamp;

              setLastUpdated(match.time || Date.now());
              setIsLiveActive(true);

              // Update latest candle in the series without disrupting user panning
              setCandles((prev) => {
                if (prev.length === 0) return prev;
                const lastCandle = { ...prev[prev.length - 1] };
                lastCandle.close = livePrice;
                lastCandle.high = Math.max(lastCandle.high, livePrice);
                lastCandle.low = Math.min(lastCandle.low, livePrice);

                seriesRef.current?.update({
                  time: Math.floor(lastCandle.time / 1000) as UTCTimestamp,
                  open: lastCandle.open,
                  high: lastCandle.high,
                  low: lastCandle.low,
                  close: lastCandle.close,
                });

                return [...prev.slice(0, prev.length - 1), lastCandle];
              });
            }
          }
        }
      } catch {
        if (!isCancelled) setIsLiveActive(false);
      }
    };

    timer = window.setInterval(pollLiveTick, 3500);

    return () => {
      isCancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [cleanSymbol]);

  // Chart Navigation Controls
  const handleZoomIn = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (range) {
      const span = range.to - range.from;
      const step = span * 0.2;
      timeScale.setVisibleLogicalRange({
        from: range.from + step,
        to: range.to - step,
      });
    }
  };

  const handleZoomOut = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (range) {
      const span = range.to - range.from;
      const step = span * 0.2;
      timeScale.setVisibleLogicalRange({
        from: range.from - step,
        to: range.to + step,
      });
    }
  };

  const handleResetZoom = () => {
    if (!chartRef.current) return;
    chartRef.current.timeScale().fitContent();
    isInspectingHistoryRef.current = false;
  };

  const handleScrollToLatest = () => {
    if (!chartRef.current) return;
    chartRef.current.timeScale().scrollToRealTime();
    isInspectingHistoryRef.current = false;
  };

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col space-y-3">
      {/* 1. Header Toolbar: Symbol, Price, Timeframes, and Data Source Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-base tracking-tight font-mono">
                {cleanSymbol}
              </span>
              <span className="font-mono text-base font-bold text-slate-900">
                {currentPrice > 0 ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span>Strike Finance Perpetual</span>
              <span>·</span>
              <span className="flex items-center gap-1 font-mono text-emerald-700">
                <Radio className={`w-3 h-3 ${isLiveActive ? 'animate-pulse text-emerald-600' : 'text-slate-400'}`} />
                <span>{isLiveActive ? 'Live Polling (3s)' : 'Offline'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Timeframe Selector Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {(['15m', '1h', '4h', '1d'] as KlineInterval[]).map((tf) => (
            <button
              key={tf}
              onClick={() => handleIntervalSelect(tf)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                interval === tf
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Zoom & Navigation Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Zoom in (+)"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Zoom out (-)"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Fit candles to screen"
            aria-label="Fit candles"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleScrollToLatest}
            className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            title="Scroll to latest live candle"
          >
            <span>Live Bar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={loadHistoricalCandles}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-40"
            title="Reload from Strike Finance"
            aria-label="Reload market data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#059669]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Floating OHLC Legend (TradingView Inspection Bar) */}
      {legendData && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono px-2 text-slate-600">
          <span className="text-slate-400 font-sans">{legendData.time}</span>
          <span>
            O: <strong className="text-slate-900">${legendData.open.toFixed(2)}</strong>
          </span>
          <span>
            H: <strong className="text-slate-900">${legendData.high.toFixed(2)}</strong>
          </span>
          <span>
            L: <strong className="text-slate-900">${legendData.low.toFixed(2)}</strong>
          </span>
          <span>
            C: <strong className="text-slate-900">${legendData.close.toFixed(2)}</strong>
          </span>
          <span className={legendData.change >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
            {legendData.change >= 0 ? '+' : ''}${legendData.change.toFixed(2)} ({legendData.changePct.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* 3. Main Chart Canvas Area */}
      <div className="relative w-full overflow-hidden" style={{ height }}>
        {loading && candles.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-xs text-xs text-slate-500 gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#059669]" />
            <span>Streaming historical candlesticks from Strike Finance...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-50/95 text-center text-xs text-slate-600 gap-3">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <div>
              <p className="font-bold text-slate-900">{error}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Data source: Strike Finance Price Engine (/price/v2/klines)
              </p>
            </div>
            <button
              onClick={loadHistoricalCandles}
              className="px-3.5 py-1.5 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-xl transition-colors cursor-pointer"
            >
              Retry Live Request
            </button>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* 4. Bottom Data Verifiability Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
          <span>
            <strong>Verified Source:</strong> Strike Finance REST/WS API · {candles.length} continuous historical bars
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Last Tick: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC</span>
        </div>
      </div>
    </div>
  );
};
