import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INDICATOR_META, type IndicatorConfig, type IndicatorId } from "@/lib/chart/indicators";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configs: IndicatorConfig[];
  onChange: (next: IndicatorConfig[]) => void;
}

export function IndicatorManagerModal({ open, onOpenChange, configs, onChange }: Props) {
  const update = (id: IndicatorId, patch: Partial<IndicatorConfig>) =>
    onChange(configs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Indicators</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {configs.map((c) => {
            const meta = INDICATOR_META[c.id];
            return (
              <div key={c.id} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                  <Switch
                    checked={c.enabled}
                    onCheckedChange={(v) => update(c.id, { enabled: v })}
                    aria-label={`Toggle ${meta.label}`}
                  />
                </div>
                {c.enabled && meta.defaultPeriod > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <Label htmlFor={`period-${c.id}`} className="text-xs text-muted-foreground">
                      Period
                    </Label>
                    <Input
                      id={`period-${c.id}`}
                      type="number"
                      min={2}
                      max={200}
                      value={c.period}
                      onChange={(e) => update(c.id, { period: Math.max(2, Number(e.target.value) || 2) })}
                      className="h-8 w-24"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
