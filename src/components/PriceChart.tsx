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

function oklchToHex(str: string): string | null {
  const m = str.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i);
  if (!m) return null;
  const num = (s: string, scale: number) =>
    s.endsWith("%") ? (parseFloat(s) / 100) * scale : parseFloat(s);
  const L = num(m[1]!, 1);
  const C = num(m[2]!, 0.4);
  const H = parseFloat(m[3]!);
  const h = (H * Math.PI) / 180;
  const a = Math.cos(h) * C;
  const b = Math.sin(h) * C;
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l3 = l_ ** 3, m3 = m_ ** 3, s3 = s_ ** 3;
  const lin = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
  const toHex = (v: number) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    const i = Math.round(Math.min(1, Math.max(0, c)) * 255);
    return i.toString(16).padStart(2, "0");
  };
  return `#${lin.map(toHex).join("")}`;
}

function cssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!v) return fallback;
  if (v.startsWith("oklch")) return oklchToHex(v) ?? fallback;
  // bare token like "68% .02 252"
  if (/^[\d.]+%?\s+[\d.]+%?\s+[\d.]+$/.test(v)) return oklchToHex(`oklch(${v})`) ?? fallback;
  return v;
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
      autoSize: true,

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
      localization: { locale: "en-US" },

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
