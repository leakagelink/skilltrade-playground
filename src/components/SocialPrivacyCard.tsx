import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getCompeteOverview, updateSocialPrivacy } from "@/lib/compete.functions";
import { COUNTRIES } from "@/lib/compete/config";
import { Switch } from "@/components/ui/switch";

/**
 * Version 1.4 social privacy controls. Country is optional and user-selected —
 * TradeVirt never requests device location and never shows a precise location.
 */
export function SocialPrivacyCard() {
  const qc = useQueryClient();
  const load = useServerFn(getCompeteOverview);
  const save = useServerFn(updateSocialPrivacy);

  const { data } = useQuery({ queryKey: ["compete-overview"], queryFn: () => load(), staleTime: 30_000 });

  const [country, setCountry] = useState<string>("");
  const [showCountry, setShowCountry] = useState(false);
  const [publicProfile, setPublicProfile] = useState(false);

  useEffect(() => {
    if (!data) return;
    setCountry(data.privacy.country ?? "");
    setShowCountry(data.privacy.showCountry);
    setPublicProfile(data.privacy.isPublicProfile);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (next: { country: string | null; showCountry: boolean; isPublicProfile: boolean }) =>
      save({
        data: {
          ...next,
          isLeaderboardVisible: data?.privacy.isLeaderboardVisible ?? true,
        },
      }),
    onSuccess: () => {
      toast.success("Privacy settings saved.");
      void qc.invalidateQueries({ queryKey: ["compete-overview"] });
      void qc.invalidateQueries({ queryKey: ["social-leaderboard"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not save your privacy settings."),
  });

  const commit = (next: Partial<{ country: string; showCountry: boolean; isPublicProfile: boolean }>) => {
    const merged = {
      country: (next.country ?? country) || null,
      showCountry: next.showCountry ?? showCountry,
      isPublicProfile: next.isPublicProfile ?? publicProfile,
    };
    mutation.mutate(merged);
  };

  return (
    <section className="surface-card space-y-4 p-4">
      <div>
        <p className="text-sm font-medium">Country (optional)</p>
        <p className="text-xs text-muted-foreground">
          Used only for country leaderboards. No location access is ever requested.
        </p>
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            commit({ country: e.target.value });
          }}
          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="">Not set</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Show my country</p>
          <p className="text-xs text-muted-foreground">Displays your country beside your name on leaderboards.</p>
        </div>
        <Switch
          checked={showCountry}
          onCheckedChange={(v) => {
            setShowCountry(v);
            commit({ showCountry: v });
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Public trader profile</p>
          <p className="text-xs text-muted-foreground">
            Shows username, level, skill score and badges only. Email, private trades and account details are never
            shared.
          </p>
        </div>
        <Switch
          checked={publicProfile}
          onCheckedChange={(v) => {
            setPublicProfile(v);
            commit({ isPublicProfile: v });
          }}
        />
      </div>
    </section>
  );
}
