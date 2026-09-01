import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { CATEGORIES, TOOLS, type DrawingMode } from "@/lib/chart/drawings";
import { Pin, PinOff } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTool: DrawingMode | null;
  onPick: (mode: DrawingMode) => void;
  pinned: DrawingMode[];
  onTogglePin: (mode: DrawingMode) => void;
}

export function DrawingToolsSheet({ open, onOpenChange, activeTool, onPick, pinned, onTogglePin }: Props) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="px-0">
          <SheetTitle>Drawing tools</SheetTitle>
        </SheetHeader>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tools…"
          className="mb-4"
        />
        <div className="space-y-5 pb-8">
          {CATEGORIES.map((cat) => {
            const tools = TOOLS.filter(
              (t) => t.category === cat && (!query || t.label.toLowerCase().includes(query)),
            );
            if (tools.length === 0) return null;
            return (
              <section key={cat}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {cat}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {tools.map((t) => (
                    <div
                      key={t.mode}
                      className={`flex items-center justify-between gap-1 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                        activeTool === t.mode
                          ? "border-primary bg-primary/15 text-foreground"
                          : "border-border/60 bg-secondary/40"
                      }`}
                    >
                      <button
                        type="button"
                        className="min-h-[24px] flex-1 text-left"
                        onClick={() => {
                          onPick(t.mode);
                          onOpenChange(false);
                        }}
                      >
                        {t.label}
                      </button>
                      <button
                        type="button"
                        aria-label={pinned.includes(t.mode) ? `Unpin ${t.label}` : `Pin ${t.label}`}
                        onClick={() => onTogglePin(t.mode)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {pinned.includes(t.mode) ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
