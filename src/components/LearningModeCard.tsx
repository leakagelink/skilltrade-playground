import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { MODES, usePersonalization, useSavePersonalization, type LearningMode } from "@/lib/personalization";
import { trackEvent } from "@/lib/analytics";

export function LearningModeCard() {
  const { data } = usePersonalization();
  const save = useSavePersonalization();
  const active = data?.active_learning_mode ?? "beginner";

  function pick(mode: LearningMode) {
    if (mode === active) return;
    save.mutate(
      { active_learning_mode: mode, ...(data ? {} : { experience_level: mode }) },
      {
        onSuccess: () => {
          toast.success(`${MODES.find((m) => m.value === mode)?.label} Mode on`);
          void trackEvent("learning_mode_changed", { mode });
        },
        onError: () => toast.error("Could not change mode. Please try again."),
      },
    );
  }

  return (
    <section className="surface-card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <GraduationCap className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Learning Mode</h2>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            disabled={save.isPending}
            onClick={() => pick(m.value)}
            className={`rounded-xl border p-2 text-left transition ${
              active === m.value ? "border-primary bg-primary/10" : "border-border bg-secondary/40"
            }`}
          >
            <p className="text-xs font-semibold">{m.label}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{m.desc}</p>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Switch anytime. Modes only change guidance and detail — every feature stays available and your trading data is not changed.
      </p>
    </section>
  );
}
