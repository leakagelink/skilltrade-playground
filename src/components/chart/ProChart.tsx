import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/market/types";
import { cssColor, withAlpha } from "@/lib/chart/color";
import {
  INDICATOR_META,
  bollinger,
  ema,
  macd as macdCalc,
  rsi as rsiCalc,
  sma,
  toPoints,
  vwap,
  type IndicatorConfig,
  type IndicatorId,
} from "@/lib/chart/indicators";
import { detectPatterns } from "@/lib/chart/patterns";
import { ChartOverlay } from "./ChartOverlay";
import { BottomToolDock } from "./BottomToolDock";
import { DrawingToolsSheet } from "./DrawingToolsSheet";
import { IndicatorManagerModal } from "./IndicatorManagerModal";
import { useChartDrawings } from "@/hooks/useChartDrawings";
import { usePinnedTools } from "@/hooks/usePinnedTools";
import { DRAW_COLORS, type DrawingMode } from "@/lib/chart/drawings";
import { Eye, EyeOff, Lock, LockOpen, Maximize2, Minimize2, Trash2 } from "lucide-react";

const DEFAULT_INDICATORS: IndicatorConfig[] = (
  ["sma", "ema", "bb", "vwap", "rsi", "macd"] as IndicatorId[]
).map((id) => ({
  id,
  enabled: id === "sma",
  period: INDICATOR_META[id].defaultPeriod || 14,
  color: "#38bdf8",
}));

interface Props {
  symbol: string;
  candles: Candle[];
  showPatterns?: boolean;
  height?: number;
  /** Latest streamed price; folded into the forming candle between candle refetches. */
  livePrice?: number | null;
}

export function ProChart({ symbol, candles, showPatterns = true, height = 380, livePrice = null }: Props) {
  const holderRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [ready, setReady] = useState(0);
  const [legend, setLegend] = useState<Candle | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(DEFAULT_INDICATORS);
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawingMode | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [magnet, setMagnet] = useState(false);
  const [color, setColor] = useState(DRAW_COLORS[0]!);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { drawings, setDrawings, commit, undo, redo } = useChartDrawings(symbol);
  const { pinned, toggle: togglePin } = usePinnedTools();

  const chartHeight = fullscreen ? undefined : height;

  /* ---------- base chart ---------- */
  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const bull = cssColor("--bull", "#22c55e");
    const bear = cssColor("--bear", "#ef4444");
    const text = cssColor("--muted-foreground", "#94a3b8");
    const grid = cssColor("--border", "#1f2937");

    const chart = createChart(holder, {
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: text,
        fontFamily: "'JetBrains Mono', monospace",
        attributionLogo: false,
        panes: { separatorColor: grid, separatorHoverColor: withAlpha(grid, 0.6) },
      },
      localization: { locale: "en-US" },
      grid: {
        vertLines: { color: withAlpha(grid, 0.25) },
        horzLines: { color: withAlpha(grid, 0.25) },
      },
      rightPriceScale: { borderColor: grid, scaleMargins: { top: 0.1, bottom: 0.22 } },
      timeScale: { borderColor: grid, timeVisible: true, secondsVisible: false, rightOffset: 6 },
      crosshair: { mode: 0 },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: bull,
      downColor: bear,
      borderVisible: false,
      wickUpColor: bull,
      wickDownColor: bear,
    });
    seriesRef.current = candleSeries;

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volSeriesRef.current = volSeries;

    setReady((n) => n + 1);

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volSeriesRef.current = null;
      indicatorSeriesRef.current = {};
      markersRef.current = null;
    };
  }, []);

  const volSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const indicatorSeriesRef = useRef<Record<string, ISeriesApi<"Line" | "Histogram">>>({});
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  /* ---------- data ---------- */
  useEffect(() => {
    const series = seriesRef.current;
    const vol = volSeriesRef.current;
    if (!series || !vol || candles.length === 0) return;
    const bull = cssColor("--bull", "#22c55e");
    const bear = cssColor("--bear", "#ef4444");

    series.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
    vol.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: withAlpha(c.close >= c.open ? bull : bear, 0.35),
      })),
    );
    setLegend(candles[candles.length - 1] ?? null);
  }, [candles, ready]);

  /* ---------- live tick: fold the streamed price into the forming candle ---------- */
  useEffect(() => {
    const series = seriesRef.current;
    const last = candles[candles.length - 1];
    if (!series || !last || livePrice == null || !Number.isFinite(livePrice)) return;
    const live: Candle = {
      ...last,
      close: livePrice,
      high: Math.max(last.high, livePrice),
      low: Math.min(last.low, livePrice),
    };
    series.update({
      time: live.time as UTCTimestamp,
      open: live.open,
      high: live.high,
      low: live.low,
      close: live.close,
    });
    setLegend((prev) => (prev && prev.time !== live.time ? prev : live));
  }, [livePrice, candles, ready]);

  /* ---------- crosshair legend ---------- */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const byTime = new Map(candles.map((c) => [c.time, c]));
    const handler = (param: { time?: Time }) => {
      if (param.time === undefined) {
        setLegend(candles[candles.length - 1] ?? null);
        return;
      }
      setLegend(byTime.get(param.time as number) ?? null);
    };
    chart.subscribeCrosshairMove(handler);
    return () => chart.unsubscribeCrosshairMove(handler);
  }, [candles, ready]);

  /* ---------- indicators ---------- */
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || candles.length === 0) return;
    for (const s of Object.values(indicatorSeriesRef.current)) {
      try {
        chart.removeSeries(s);
      } catch {
        /* series already gone */
      }
    }
    indicatorSeriesRef.current = {};

    const closes = candles.map((c) => c.close);
    const add = (
      key: string,
      data: { time: number; value: number }[],
      lineColor: string,
      paneIndex = 0,
      width: 1 | 2 = 2,
    ) => {
      if (data.length === 0) return;
      const s = chart.addSeries(
        LineSeries,
        { color: lineColor, lineWidth: width, priceLineVisible: false, lastValueVisible: false },
        paneIndex,
      );
      s.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })));
      indicatorSeriesRef.current[key] = s;
    };

    let subPane = 0;
    for (const cfg of indicators) {
      if (!cfg.enabled) continue;
      const meta = INDICATOR_META[cfg.id];
      const tone = cssColor(meta.token, "#38bdf8");
      if (cfg.id === "sma") add("sma", toPoints(candles, sma(closes, cfg.period)), tone);
      if (cfg.id === "ema") add("ema", toPoints(candles, ema(closes, cfg.period)), tone);
      if (cfg.id === "vwap") add("vwap", toPoints(candles, vwap(candles)), tone, 0, 1);
      if (cfg.id === "bb") {
        const bb = bollinger(closes, cfg.period);
        add("bb-u", toPoints(candles, bb.upper), withAlpha(tone, 0.9), 0, 1);
        add("bb-m", toPoints(candles, bb.mid), withAlpha(tone, 0.5), 0, 1);
        add("bb-l", toPoints(candles, bb.lower), withAlpha(tone, 0.9), 0, 1);
      }
      if (cfg.id === "rsi") {
        subPane += 1;
        add("rsi", toPoints(candles, rsiCalc(closes, cfg.period)), tone, subPane);
        const s = indicatorSeriesRef.current["rsi"];
        s?.createPriceLine({ price: 70, color: cssColor("--bear", "#ef4444"), lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "" });
        s?.createPriceLine({ price: 30, color: cssColor("--bull", "#22c55e"), lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "" });
      }
      if (cfg.id === "macd") {
        subPane += 1;
        const m = macdCalc(closes);
        add("macd", toPoints(candles, m.line), tone, subPane);
        add("macd-sig", toPoints(candles, m.signal), cssColor("--bear", "#ef4444"), subPane, 1);
        const hist = chart.addSeries(HistogramSeries, { priceLineVisible: false }, subPane);
        hist.setData(
          toPoints(candles, m.hist).map((d) => ({
            time: d.time as UTCTimestamp,
            value: d.value,
            color: withAlpha(d.value >= 0 ? cssColor("--bull", "#22c55e") : cssColor("--bear", "#ef4444"), 0.6),
          })),
        );
        indicatorSeriesRef.current["macd-hist"] = hist;
      }
    }
  }, [indicators, candles, ready]);

  /* ---------- candlestick pattern markers ---------- */
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    if (!showPatterns) {
      markersRef.current?.setMarkers([]);
      return;
    }
    const hits = detectPatterns(candles).slice(-6);
    const markers: SeriesMarker<Time>[] = hits.map((h) => ({
      time: h.time as UTCTimestamp,
      position: h.bias === "bear" ? "aboveBar" : "belowBar",
      color: cssColor(h.bias === "bear" ? "--bear" : h.bias === "bull" ? "--bull" : "--muted-foreground", "#94a3b8"),
      shape: h.bias === "bear" ? "arrowDown" : "arrowUp",
      text: h.label,
    }));
    if (!markersRef.current) markersRef.current = createSeriesMarkers(series, markers);
    else markersRef.current.setMarkers(markers);
  }, [candles, showPatterns, ready]);

  /* ---------- fullscreen sizing ---------- */
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const selected = useMemo(() => drawings.find((d) => d.id === selectedId) ?? null, [drawings, selectedId]);

  const patchSelected = useCallback(
    (patch: Partial<(typeof drawings)[number]>) => {
      if (!selectedId) return;
      commit((prev) => prev.map((d) => (d.id === selectedId ? { ...d, ...patch } : d)));
    },
    [commit, selectedId],
  );

  const change = legend ? ((legend.close - legend.open) / (legend.open || 1)) * 100 : 0;

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-background pb-[env(safe-area-inset-bottom)]"
          : "relative"
      }
    >
      <div className="relative flex-1" style={{ minHeight: fullscreen ? 0 : chartHeight }}>
        <div
          ref={holderRef}
          className="h-full w-full"
          style={{
            height: fullscreen ? "100%" : chartHeight,
            touchAction: activeTool || selectMode ? "none" : "pan-y",
            overscrollBehavior: "contain",
          }}
        />

        <ChartOverlay
          chart={chartRef.current}
          series={seriesRef.current}
          candles={candles}
          drawings={drawings}
          activeTool={activeTool}
          selectMode={selectMode}
          magnet={magnet}
          color={color}
          lineWidth={2}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCommit={commit}
          onLiveUpdate={setDrawings}
          onToolFinished={() => setActiveTool(null)}
          height={fullscreen ? 0 : height}
        />

        {/* OHLC legend */}
        {legend && (
          <div className="pointer-events-none absolute left-2 top-2 z-20 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border border-border/50 bg-card/70 px-2.5 py-1.5 font-mono text-[10px] backdrop-blur-md">
            <span className="font-semibold text-foreground">{symbol}</span>
            <span className="text-muted-foreground">O {legend.open.toFixed(2)}</span>
            <span className="text-muted-foreground">H {legend.high.toFixed(2)}</span>
            <span className="text-muted-foreground">L {legend.low.toFixed(2)}</span>
            <span className="text-muted-foreground">C {legend.close.toFixed(2)}</span>
            <span className={change >= 0 ? "text-bull" : "text-bear"}>
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          </div>
        )}

        <button
          type="button"
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen chart"}
          onClick={() => setFullscreen((v) => !v)}
          className="absolute right-2 top-2 z-20 flex size-9 items-center justify-center rounded-lg border border-border/50 bg-card/70 text-muted-foreground backdrop-blur-md"
        >
          {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>

        {/* floating properties bar for the selected drawing */}
        {selected && (
          <div className="absolute left-1/2 top-12 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border/60 bg-card/90 p-1 backdrop-blur-md">
            {DRAW_COLORS.slice(0, 4).map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Set color ${c}`}
                onClick={() => patchSelected({ color: c })}
                style={{ backgroundColor: c }}
                className="size-6 rounded-full"
              />
            ))}
            <button
              type="button"
              aria-label={selected.locked ? "Unlock drawing" : "Lock drawing"}
              onClick={() => patchSelected({ locked: !selected.locked })}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground"
            >
              {selected.locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
            </button>
            <button
              type="button"
              aria-label={selected.visible === false ? "Show drawing" : "Hide drawing"}
              onClick={() => patchSelected({ visible: selected.visible === false })}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground"
            >
              {selected.visible === false ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
            <button
              type="button"
              aria-label="Delete drawing"
              onClick={() => {
                commit((prev) => prev.filter((d) => d.id !== selected.id));
                setSelectedId(null);
              }}
              className="flex size-8 items-center justify-center rounded-lg text-bear"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div
        className={
          fullscreen ? "pointer-events-none px-3 pb-3" : "pointer-events-none mt-2"
        }
      >
        <BottomToolDock
          activeTool={activeTool}
          selectMode={selectMode}
          magnet={magnet}
          color={color}
          pinned={pinned}
          onToggleSelect={() => {
            setActiveTool(null);
            setSelectMode((v) => !v);
          }}
          onPick={(m) => {
            setActiveTool(m);
            setSelectedId(null);
          }}
          onOpenTools={() => setToolsOpen(true)}
          onOpenIndicators={() => setIndicatorsOpen(true)}
          onToggleMagnet={() => setMagnet((v) => !v)}
          onColor={setColor}
          onUndo={undo}
          onRedo={redo}
          onClear={() => {
            commit(() => []);
            setSelectedId(null);
          }}
        />
      </div>

      <DrawingToolsSheet
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        activeTool={activeTool}
        onPick={(m) => {
          setActiveTool(m);
          setSelectMode(false);
          setSelectedId(null);
        }}
        pinned={pinned}
        onTogglePin={togglePin}
      />
      <IndicatorManagerModal
        open={indicatorsOpen}
        onOpenChange={setIndicatorsOpen}
        configs={indicators}
        onChange={setIndicators}
      />
    </div>
  );
}
