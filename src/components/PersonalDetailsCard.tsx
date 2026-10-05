import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CAPITAL_RANGES, usePersonalization, useSavePersonalization, type CapitalRange } from "@/lib/personalization";

export function PersonalDetailsCard() {
  const { data } = usePersonalization();
  const save = useSavePersonalization();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [capital, setCapital] = useState<CapitalRange | null>(null);

  useEffect(() => {
    setName(data?.full_name ?? "");
    setMobile(data?.mobile ?? "");
    setCapital(data?.hypothetical_starting_capital_range ?? null);
  }, [data]);

  function submit() {
    const m = mobile.trim();
    if (m && !/^\+?[0-9 ]{6,20}$/.test(m)) {
      toast.error("Enter a valid mobile number, or leave it empty.");
      return;
    }
    save.mutate(
      { full_name: name.trim() || null, mobile: m || null, hypothetical_starting_capital_range: capital },
      { onSuccess: () => toast.success("Saved"), onError: () => toast.error("Could not save. Please try again.") },
    );
  }

  return (
    <section className="surface-card space-y-3 p-4">
      <div className="flex items-center gap-2">
        <UserRound className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Private details</h2>
      </div>
      <p className="text-[11px] text-muted-foreground">Only you can see these. They are never shown on leaderboards, trader cards or challenges.</p>
      <div>
        <Label htmlFor="pd-name">Full name (optional)</Label>
        <Input id="pd-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="mt-1.5 rounded-xl" />
      </div>
      <div>
        <Label htmlFor="pd-mobile">Mobile number (optional)</Label>
        <Input id="pd-mobile" type="tel" value={mobile} maxLength={20} onChange={(e) => setMobile(e.target.value)} className="mt-1.5 rounded-xl" />
      </div>
      <div>
        <Label>Hypothetical starting amount (optional)</Label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CAPITAL_RANGES.map((c) => (
            <Button key={c.value} type="button" size="sm" variant={capital === c.value ? "default" : "outline"} onClick={() => setCapital(capital === c.value ? null : c.value)} className="h-7 text-[11px]">
              {c.label}
            </Button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Tap the selected option again to remove it. Not used for advice or predictions.</p>
      </div>
      <Button className="w-full rounded-xl" disabled={save.isPending} onClick={submit}>Save</Button>
    </section>
  );
}
