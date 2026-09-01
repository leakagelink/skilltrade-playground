import { DRAW_COLORS, TOOL_BY_MODE, type DrawingMode } from "@/lib/chart/drawings";
import {
  Magnet,
  MousePointer2,
  PenLine,
  Redo2,
  Trash2,
  Undo2,
  LineChart,
} from "lucide-react";

interface Props {
  activeTool: DrawingMode | null;
  selectMode: boolean;
  magnet: boolean;
  color: string;
  pinned: DrawingMode[];
  onToggleSelect: () => void;
  onPick: (mode: DrawingMode | null) => void;
  onOpenTools: () => void;
  onOpenIndicators: () => void;
  onToggleMagnet: () => void;
  onColor: (c: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

export function BottomToolDock({
  activeTool,
  selectMode,
  magnet,
  color,
  pinned,
  onToggleSelect,
  onPick,
  onOpenTools,
  onOpenIndicators,
  onToggleMagnet,
  onColor,
  onUndo,
  onRedo,
  onClear,
}: Props) {
  const btn = (active: boolean) =>
    `flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
    }`;

  return (
    <div className="pointer-events-auto space-y-2">
      {pinned.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-border/60 bg-card/80 p-1.5 backdrop-blur-md">
          {pinned.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onPick(activeTool === mode ? null : mode)}
              className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors ${
                activeTool === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground"
              }`}
            >
              {TOOL_BY_MODE[mode].label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-border/60 bg-card/80 p-1.5 backdrop-blur-md">
        <button type="button" aria-label="Select mode" className={btn(selectMode && !activeTool)} onClick={onToggleSelect}>
          <MousePointer2 className="size-5" />
        </button>
        <button type="button" aria-label="Drawing tools" className={btn(Boolean(activeTool))} onClick={onOpenTools}>
          <PenLine className="size-5" />
        </button>
        <button type="button" aria-label="Indicators" className={btn(false)} onClick={onOpenIndicators}>
          <LineChart className="size-5" />
        </button>
        <button type="button" aria-label="Magnet mode" className={btn(magnet)} onClick={onToggleMagnet}>
          <Magnet className="size-5" />
        </button>
        <button type="button" aria-label="Undo" className={btn(false)} onClick={onUndo}>
          <Undo2 className="size-5" />
        </button>
        <button type="button" aria-label="Redo" className={btn(false)} onClick={onRedo}>
          <Redo2 className="size-5" />
        </button>
        <button type="button" aria-label="Delete all drawings" className={btn(false)} onClick={onClear}>
          <Trash2 className="size-5" />
        </button>
        <div className="ml-1 flex shrink-0 items-center gap-1 border-l border-border/60 pl-2">
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Drawing color ${c}`}
              onClick={() => onColor(c)}
              style={{ backgroundColor: c }}
              className={`size-5 rounded-full ring-offset-2 ring-offset-card transition-all ${
                color === c ? "ring-2 ring-foreground" : ""
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
