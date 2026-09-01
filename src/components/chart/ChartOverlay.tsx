import { useCallback, useEffect, useRef } from "react";
import type { IChartApi, ISeriesApi, Logical } from "lightweight-charts";
import type { Candle } from "@/lib/market/types";
import {
  FIB_COLORS,
  FIB_EXTENSION,
  FIB_RETRACEMENT,
  TOOL_BY_MODE,
  type Drawing,
  type DrawingMode,
  type DrawingPoint,
} from "@/lib/chart/drawings";
import { cssColor, withAlpha } from "@/lib/chart/color";

interface Props {
  chart: IChartApi | null;
  series: ISeriesApi<"Candlestick"> | null;
  candles: Candle[];
  drawings: Drawing[];
  activeTool: DrawingMode | null;
  selectMode: boolean;
  magnet: boolean;
  color: string;
  lineWidth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCommit: (updater: (prev: Drawing[]) => Drawing[]) => void;
  /** updates drawings without pushing a history entry (used while dragging) */
  onLiveUpdate: (updater: (prev: Drawing[]) => Drawing[]) => void;
  onToolFinished: () => void;
  height: number;
}

const HIT = 12;
const DRAG_THRESHOLD = 8;

export function ChartOverlay({
  chart,
  series,
  candles,
  drawings,
  activeTool,
  selectMode,
  magnet,
  color,
  lineWidth,
  selectedId,
  onSelect,
  onCommit,
  onLiveUpdate,
  onToolFinished,
  height,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftRef = useRef<Drawing | null>(null);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    id: string;
    pointIndex: number | null;
    start: { x: number; y: number };
    origin: DrawingPoint[];
    moved: boolean;
  } | null>(null);
  const stateRef = useRef({ drawings, activeTool, selectedId, magnet, color, lineWidth, candles });
  stateRef.current = { drawings, activeTool, selectedId, magnet, color, lineWidth, candles };

  /* ---------- coordinate conversion ---------- */

  const timeToLogical = useCallback((time: number) => {
    const cs = stateRef.current.candles;
    if (cs.length < 2) return 0;
    const first = cs[0]!.time;
    const step = (cs[cs.length - 1]!.time - first) / (cs.length - 1) || 1;
    if (time <= first) return (time - first) / step;
    if (time >= cs[cs.length - 1]!.time) return cs.length - 1 + (time - cs[cs.length - 1]!.time) / step;
    let lo = 0;
    let hi = cs.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cs[mid]!.time <= time) lo = mid;
      else hi = mid;
    }
    const span = cs[hi]!.time - cs[lo]!.time || 1;
    return lo + (time - cs[lo]!.time) / span;
  }, []);

  const logicalToTime = useCallback((logical: number) => {
    const cs = stateRef.current.candles;
    if (cs.length < 2) return 0;
    const step = (cs[cs.length - 1]!.time - cs[0]!.time) / (cs.length - 1) || 1;
    if (logical <= 0) return cs[0]!.time + logical * step;
    if (logical >= cs.length - 1) return cs[cs.length - 1]!.time + (logical - (cs.length - 1)) * step;
    const i = Math.floor(logical);
    const frac = logical - i;
    return cs[i]!.time + frac * (cs[i + 1]!.time - cs[i]!.time);
  }, []);

  const toPixel = useCallback(
    (p: DrawingPoint): { x: number; y: number } | null => {
      if (!chart || !series) return null;
      const x = chart.timeScale().logicalToCoordinate(timeToLogical(p.time) as Logical);
      const y = series.priceToCoordinate(p.price);
      if (x === null || y === null) return null;
      return { x, y };
    },
    [chart, series, timeToLogical],
  );

  const toData = useCallback(
    (x: number, y: number): DrawingPoint | null => {
      if (!chart || !series) return null;
      const logical = chart.timeScale().coordinateToLogical(x);
      const price = series.coordinateToPrice(y);
      if (logical === null || price === null) return null;
      let point: DrawingPoint = { time: logicalToTime(logical), price };
      if (stateRef.current.magnet) {
        const cs = stateRef.current.candles;
        const idx = Math.round(logical);
        const c = cs[Math.max(0, Math.min(cs.length - 1, idx))];
        if (c) {
          const candidates = [c.open, c.high, c.low, c.close];
          let best = point.price;
          let bestDist = Infinity;
          for (const v of candidates) {
            const cy = series.priceToCoordinate(v);
            if (cy === null) continue;
            const d = Math.abs(cy - y);
            if (d < bestDist) {
              bestDist = d;
              best = v;
            }
          }
          if (bestDist < 30) point = { time: c.time, price: best };
        }
      }
      return point;
    },
    [chart, series, logicalToTime],
  );

  /* ---------- rendering ---------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !chart || !series) return;
    let raf = 0;

    const render = () => {
      raf = requestAnimationFrame(render);
      const ctx = canvas.getContext("2d");
      const parent = canvas.parentElement;
      if (!ctx || !parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const all = draftRef.current ? [...stateRef.current.drawings, draftRef.current] : stateRef.current.drawings;
      for (const d of all) {
        if (d.visible === false) continue;
        drawOne(ctx, d, w, h);
      }

      // precision crosshair while a tool is armed
      const cur = cursorRef.current;
      if (cur && stateRef.current.activeTool) {
        ctx.save();
        ctx.strokeStyle = withAlpha(cssColor("--muted-foreground", "#94a3b8"), 0.5);
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cur.x, 0);
        ctx.lineTo(cur.x, h);
        ctx.moveTo(0, cur.y);
        ctx.lineTo(w, cur.y);
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawOne = (ctx: CanvasRenderingContext2D, d: Drawing, w: number, h: number) => {
      const pts = d.points.map(toPixel);
      if (pts.some((p) => p === null)) return;
      const P = pts as { x: number; y: number }[];
      if (P.length === 0) return;
      const a = P[0]!;
      const b = P[1] ?? a;
      const selected = d.id === stateRef.current.selectedId;

      ctx.save();
      ctx.globalAlpha = d.opacity ?? 1;
      ctx.strokeStyle = d.color;
      ctx.fillStyle = d.color;
      ctx.lineWidth = d.lineWidth || 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.font = "11px 'JetBrains Mono', monospace";

      const seg = (x1: number, y1: number, x2: number, y2: number) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      };
      const label = (text: string, x: number, y: number, bg = d.color) => {
        const pad = 4;
        const tw = ctx.measureText(text).width;
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = bg;
        ctx.fillRect(x, y - 12, tw + pad * 2, 15);
        ctx.fillStyle = "#0b0f16";
        ctx.fillText(text, x + pad, y - 1);
        ctx.restore();
      };
      const extend = (p1: { x: number; y: number }, p2: { x: number; y: number }, both: boolean) => {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const k = (w + h) * 2;
        const ex = { x: p2.x + (dx / len) * k, y: p2.y + (dy / len) * k };
        const sx = both ? { x: p1.x - (dx / len) * k, y: p1.y - (dy / len) * k } : p1;
        seg(sx.x, sx.y, ex.x, ex.y);
      };

      switch (d.type) {
        case "trendline":
          seg(a.x, a.y, b.x, b.y);
          break;
        case "ray":
          extend(a, b, false);
          break;
        case "extended":
          extend(a, b, true);
          break;
        case "arrowline": {
          seg(a.x, a.y, b.x, b.y);
          const ang = Math.atan2(b.y - a.y, b.x - a.x);
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - 10 * Math.cos(ang - 0.4), b.y - 10 * Math.sin(ang - 0.4));
          ctx.lineTo(b.x - 10 * Math.cos(ang + 0.4), b.y - 10 * Math.sin(ang + 0.4));
          ctx.closePath();
          ctx.fill();
          break;
        }
        case "hline":
          seg(0, a.y, w, a.y);
          label(d.points[0]!.price.toFixed(2), w - 62, a.y - 2);
          break;
        case "hray":
          seg(a.x, a.y, w, a.y);
          label(d.points[0]!.price.toFixed(2), w - 62, a.y - 2);
          break;
        case "vline":
          seg(a.x, 0, a.x, h);
          break;
        case "crossline":
          seg(0, a.y, w, a.y);
          seg(a.x, 0, a.x, h);
          break;
        case "parallel": {
          const c = P[2] ?? b;
          const offset = c.y - (a.y + b.y) / 2;
          seg(a.x, a.y, b.x, b.y);
          seg(a.x, a.y + offset, b.x, b.y + offset);
          ctx.globalAlpha = (d.opacity ?? 1) * 0.12;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(b.x, b.y + offset);
          ctx.lineTo(a.x, a.y + offset);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case "flatchannel": {
          seg(a.x, a.y, b.x, a.y);
          seg(a.x, b.y, b.x, b.y);
          ctx.globalAlpha = (d.opacity ?? 1) * 0.12;
          ctx.fillRect(a.x, Math.min(a.y, b.y), b.x - a.x, Math.abs(b.y - a.y));
          break;
        }
        case "fibretracement":
        case "fibextension": {
          const levels = d.type === "fibretracement" ? FIB_RETRACEMENT : FIB_EXTENSION;
          const p0 = d.points[0]!.price;
          const p1 = d.points[1]!.price;
          const x1 = Math.min(a.x, b.x);
          const x2 = Math.max(a.x, b.x);
          for (const lv of levels) {
            const value = p0 + (p1 - p0) * lv;
            const y = series.priceToCoordinate(value);
            if (y === null) continue;
            ctx.strokeStyle = FIB_COLORS[String(lv)] ?? d.color;
            ctx.fillStyle = ctx.strokeStyle;
            seg(x1, y, Math.max(x2, x1 + 40), y);
            ctx.fillText(`${lv} · ${value.toFixed(2)}`, x1 + 4, y - 3);
          }
          break;
        }
        case "fibfan": {
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          for (const lv of [0.236, 0.382, 0.5, 0.618, 0.786, 1]) {
            ctx.strokeStyle = FIB_COLORS[String(lv)] ?? d.color;
            extend(a, { x: a.x + dx, y: a.y + dy * lv }, false);
          }
          break;
        }
        case "fibtimezones": {
          const step = b.x - a.x;
          let f1 = 1;
          let f2 = 1;
          for (let i = 0; i < 9; i++) {
            const x = a.x + step * f1;
            if (x > w + 50) break;
            ctx.globalAlpha = 0.6;
            seg(x, 0, x, h);
            ctx.fillText(String(f1), x + 3, 12);
            const n = f1 + f2;
            f2 = f1;
            f1 = n;
          }
          break;
        }
        case "rectangle": {
          ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
          ctx.globalAlpha = (d.opacity ?? 1) * 0.12;
          ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
          break;
        }
        case "ellipse": {
          ctx.beginPath();
          ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = (d.opacity ?? 1) * 0.12;
          ctx.fill();
          break;
        }
        case "triangle": {
          const c = P[2] ?? b;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(c.x, c.y);
          ctx.closePath();
          ctx.stroke();
          ctx.globalAlpha = (d.opacity ?? 1) * 0.12;
          ctx.fill();
          break;
        }
        case "polyline":
        case "pen":
        case "brush":
        case "highlighter": {
          if (d.type === "brush") ctx.lineWidth = (d.lineWidth || 2) * 2.5;
          if (d.type === "highlighter") {
            ctx.lineWidth = 16;
            ctx.globalAlpha = 0.25;
          }
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          for (const p of P.slice(1)) ctx.lineTo(p.x, p.y);
          ctx.stroke();
          break;
        }
        case "text": {
          ctx.font = "600 13px 'DM Sans', sans-serif";
          ctx.fillText(d.text ?? "Text", a.x, a.y);
          break;
        }
        case "pricelabel": {
          label(`${d.text ? `${d.text} ` : ""}${d.points[0]!.price.toFixed(2)}`, a.x, a.y);
          break;
        }
        case "arrowup":
        case "arrowdown": {
          const dir = d.type === "arrowup" ? 1 : -1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.x - 7, a.y + 12 * dir);
          ctx.lineTo(a.x + 7, a.y + 12 * dir);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case "flag": {
          seg(a.x, a.y, a.x, a.y - 22);
          ctx.fillRect(a.x, a.y - 22, 16, 11);
          if (d.text) ctx.fillText(d.text, a.x + 20, a.y - 13);
          break;
        }
        case "pricerange": {
          const p0 = d.points[0]!.price;
          const p1 = d.points[1]!.price;
          const diff = p1 - p0;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
          ctx.setLineDash([]);
          label(`${diff >= 0 ? "+" : ""}${diff.toFixed(2)} (${((diff / (p0 || 1)) * 100).toFixed(2)}%)`, Math.min(a.x, b.x) + 4, Math.min(a.y, b.y) - 4);
          break;
        }
        case "daterange": {
          const bars = Math.abs(timeToLogical(d.points[1]!.time) - timeToLogical(d.points[0]!.time));
          const mins = Math.abs(d.points[1]!.time - d.points[0]!.time) / 60;
          ctx.setLineDash([4, 3]);
          seg(a.x, a.y, b.x, a.y);
          ctx.setLineDash([]);
          label(`${Math.round(bars)} bars · ${mins >= 1440 ? `${(mins / 1440).toFixed(1)}d` : `${Math.round(mins)}m`}`, Math.min(a.x, b.x) + 4, a.y - 4);
          break;
        }
        case "long":
        case "short": {
          const isLong = d.type === "long";
          const entry = d.points[0]!.price;
          const target = d.points[1]!.price;
          const stop = (d.points[2] ?? d.points[1])!.price;
          const yEntry = a.y;
          const yTarget = b.y;
          const yStop = (P[2] ?? b).y;
          const x1 = a.x;
          const x2 = Math.max(b.x, a.x + 60);
          const bull = cssColor("--bull", "#22c55e");
          const bear = cssColor("--bear", "#ef4444");
          ctx.fillStyle = withAlpha(isLong ? bull : bear, 0.18);
          ctx.fillRect(x1, Math.min(yEntry, yTarget), x2 - x1, Math.abs(yTarget - yEntry));
          ctx.fillStyle = withAlpha(isLong ? bear : bull, 0.18);
          ctx.fillRect(x1, Math.min(yEntry, yStop), x2 - x1, Math.abs(yStop - yEntry));
          ctx.strokeStyle = d.color;
          seg(x1, yEntry, x2, yEntry);
          const risk = Math.abs(entry - stop);
          const reward = Math.abs(target - entry);
          ctx.fillStyle = d.color;
          label(
            `${isLong ? "LONG" : "SHORT"} · R:R ${risk > 0 ? (reward / risk).toFixed(2) : "—"}`,
            x1 + 4,
            Math.min(yEntry, yTarget, yStop) - 4,
          );
          break;
        }
      }

      if (selected) {
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = cssColor("--accent", "#38bdf8");
        for (const p of P) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [chart, series, toPixel, timeToLogical, height]);

  /* ---------- hit testing ---------- */

  const hitTest = useCallback(
    (x: number, y: number) => {
      const list = stateRef.current.drawings;
      for (let i = list.length - 1; i >= 0; i--) {
        const d = list[i]!;
        if (d.visible === false || d.locked) continue;
        const pts = d.points.map(toPixel).filter(Boolean) as { x: number; y: number }[];
        if (pts.length === 0) continue;
        for (let j = 0; j < pts.length; j++) {
          if (Math.hypot(pts[j]!.x - x, pts[j]!.y - y) <= HIT) return { drawing: d, pointIndex: j };
        }
        if (d.type === "hline" || d.type === "hray") {
          if (Math.abs(pts[0]!.y - y) <= HIT) return { drawing: d, pointIndex: null };
          continue;
        }
        if (d.type === "vline") {
          if (Math.abs(pts[0]!.x - x) <= HIT) return { drawing: d, pointIndex: null };
          continue;
        }
        for (let j = 0; j < pts.length - 1; j++) {
          if (distToSegment(x, y, pts[j]!, pts[j + 1]!) <= HIT) return { drawing: d, pointIndex: null };
        }
        if (pts.length === 1 && Math.hypot(pts[0]!.x - x, pts[0]!.y - y) <= HIT * 2) {
          return { drawing: d, pointIndex: null };
        }
      }
      return null;
    },
    [toPixel],
  );

  /* ---------- pointer interaction ---------- */

  const relative = (e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = relative(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    const tool = stateRef.current.activeTool;

    if (!tool) {
      const hit = hitTest(x, y);
      onSelect(hit?.drawing.id ?? null);
      if (hit) {
        // snapshot once so the whole drag is a single undo step
        onCommit((prev) => prev);
        dragRef.current = {
          id: hit.drawing.id,
          pointIndex: hit.pointIndex,
          start: { x, y },
          origin: hit.drawing.points.map((p) => ({ ...p })),
          moved: false,
        };
      }
      return;
    }

    const p = toData(x, y);
    if (!p) return;
    const def = TOOL_BY_MODE[tool];
    const freehand = def.points === 0;
    draftRef.current = {
      id: crypto.randomUUID(),
      type: tool,
      points: freehand ? [p] : Array.from({ length: Math.max(2, def.points) }, () => ({ ...p })),
      color: stateRef.current.color,
      lineWidth: stateRef.current.lineWidth,
      opacity: 1,
      visible: true,
    };

    if (def.points === 1) {
      const draft = draftRef.current;
      draft.points = [p];
      if (tool === "text" || tool === "flag" || tool === "pricelabel") {
        const text = window.prompt("Label text", tool === "text" ? "Note" : "");
        if (text === null) {
          draftRef.current = null;
          return;
        }
        draft.text = text;
      }
      onCommit((prev) => [...prev, draft]);
      draftRef.current = null;
      onToolFinished();
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = relative(e);
    cursorRef.current = { x, y };

    const drag = dragRef.current;
    if (drag) {
      const dx = x - drag.start.x;
      const dy = y - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      const p = toData(x, y);
      if (!p) return;
      onCommitLive(drag, p, dx, dy);
      return;
    }

    const draft = draftRef.current;
    if (!draft) return;
    const p = toData(x, y);
    if (!p) return;
    const def = TOOL_BY_MODE[draft.type];
    if (def.points === 0) {
      draft.points = [...draft.points, p];
    } else if (def.points === 3) {
      draft.points = [draft.points[0]!, p, draft.points[2] ?? p];
    } else {
      draft.points = [draft.points[0]!, p];
    }
  };

  const onCommitLive = (
    drag: NonNullable<typeof dragRef.current>,
    p: DrawingPoint,
    dx: number,
    dy: number,
  ) => {
    onLiveUpdate((prev) =>
      prev.map((d) => {
        if (d.id !== drag.id) return d;
        if (drag.pointIndex !== null) {
          const points = d.points.map((pt, i) => (i === drag.pointIndex ? p : pt));
          return { ...d, points };
        }
        const moved = drag.origin.map((pt) => {
          const px = toPixel(pt);
          if (!px) return pt;
          const np = toData(px.x + dx, px.y + dy);
          return np ?? pt;
        });
        return { ...d, points: moved };
      }),
    );
  };


  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
    const draft = draftRef.current;
    draftRef.current = null;
    if (!draft) return;
    const def = TOOL_BY_MODE[draft.type];
    if (def.points === 0 && draft.points.length < 3) return;
    if (def.points >= 2) {
      const first = draft.points[0]!;
      const last = draft.points[draft.points.length - 1]!;
      const p1 = toPixel(first);
      const p2 = toPixel(last);
      if (p1 && p2 && Math.hypot(p2.x - p1.x, p2.y - p1.y) < DRAG_THRESHOLD) return;
      if (def.points === 3 && draft.points.length === 3) {
        // third anchor defaults to a mirrored level so the shape is usable immediately
        const mid = draft.points[1]!;
        const spread = mid.price - first.price;
        draft.points[2] = { time: mid.time, price: first.price - spread * 0.5 };
      }
    }
    onCommit((prev) => [...prev, draft]);
    onToolFinished();
  };

  const interactive = Boolean(activeTool) || selectMode;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10"
      style={{ pointerEvents: interactive ? "auto" : "none", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        cursorRef.current = null;
      }}
    />
  );
}

function distToSegment(
  x: number,
  y: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(x - a.x, y - a.y);
  let t = ((x - a.x) * dx + (y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy));
}
