import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/market/types";

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function sma(candles: Candle[], period: number) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j]!.close;
    out.push({ time: candles[i]!.time as UTCTimestamp, value: sum / period });
  }
  return out;
}

export function PriceChart({
  candles,
  showVolume = true,
  showMa = true,
  height = 320,
}: {
  candles: Candle[];
  showVolume?: boolean;
  showMa?: boolean;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const bull = cssVar("--bull", "#22c55e");
    const bear = cssVar("--bear", "#ef4444");
    const text = cssVar("--muted-foreground", "#94a3b8");
    const grid = cssVar("--border", "#1f2937");

    const chart = createChart(ref.current, {
      height,
      layout: {
        background: { color: "transparent" },
        textColor: text,
        fontFamily: "JetBrains Mono, monospace",
        attributionLogo: false,
      },
      grid: { vertLines: { color: grid }, horzLines: { color: grid } },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
      handleScale: { axisPressedMouseMove: false },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: bull,
      downColor: bear,
      borderVisible: false,
      wickUpColor: bull,
      wickDownColor: bear,
    });
    candleSeries.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    if (showVolume) {
      const volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
      });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      volSeries.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? `${bull}55` : `${bear}55`,
        })),
      );
    }

    if (showMa && candles.length > 20) {
      const maSeries = chart.addSeries(LineSeries, {
        color: cssVar("--accent", "#38bdf8"),
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      maSeries.setData(sma(candles, 20));
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      const w = ref.current?.clientWidth;
      if (w) chart.applyOptions({ width: w });
    });
    ro.observe(ref.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, showVolume, showMa, height]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
