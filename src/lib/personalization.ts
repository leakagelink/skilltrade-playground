import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LearningMode = "beginner" | "intermediate" | "expert";
export type LearningGoal = "basics" | "strategies" | "risk" | "test_strategy" | "consistency";
export type Market = "us_stocks" | "indian_stocks" | "crypto" | "commodities";
export type CapitalRange = "unknown" | "1k_10k" | "10k_50k" | "50k_1l" | "1l_5l" | "5l_plus" | "prefer_not";

export type Personalization = {
  full_name: string | null;
  mobile: string | null;
  experience_level: LearningMode;
  active_learning_mode: LearningMode;
  learning_goal: LearningGoal | null;
  preferred_markets: Market[];
  hypothetical_starting_capital_range: CapitalRange | null;
  personalization_completed: boolean;
};

export const MODES: { value: LearningMode; label: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", desc: "Guided learning, simple explanations" },
  { value: "intermediate", label: "Intermediate", desc: "Strategy practice and more metrics" },
  { value: "expert", label: "Expert", desc: "Dense analytics, minimal guidance" },
];

export const GOALS: { value: LearningGoal; label: string }[] = [
  { value: "basics", label: "Learn trading basics" },
  { value: "strategies", label: "Practice strategies" },
  { value: "risk", label: "Improve risk management" },
  { value: "test_strategy", label: "Test an existing strategy" },
  { value: "consistency", label: "Improve consistency" },
];

export const MARKETS: { value: Market; label: string }[] = [
  { value: "us_stocks", label: "US Stocks" },
  { value: "indian_stocks", label: "Indian Stocks" },
  { value: "crypto", label: "Crypto" },
  { value: "commodities", label: "Commodities" },
];

export const CAPITAL_RANGES: { value: CapitalRange; label: string }[] = [
  { value: "unknown", label: "I don't know yet" },
  { value: "1k_10k", label: "₹1,000 – ₹10,000" },
  { value: "10k_50k", label: "₹10,000 – ₹50,000" },
  { value: "50k_1l", label: "₹50,000 – ₹1,00,000" },
  { value: "1l_5l", label: "₹1,00,000 – ₹5,00,000" },
  { value: "5l_plus", label: "₹5,00,000+" },
  { value: "prefer_not", label: "Prefer not to say" },
];

const KEY = ["personalization"];

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export function usePersonalization() {
  return useQuery({
    queryKey: KEY,
    staleTime: 60_000,
    queryFn: async (): Promise<Personalization | null> => {
      const uid = await currentUserId();
      const { data, error } = await supabase
        .from("user_personalization")
        .select("full_name,mobile,experience_level,active_learning_mode,learning_goal,preferred_markets,hypothetical_starting_capital_range,personalization_completed")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      return (data as Personalization | null) ?? null;
    },
  });
}

export function useSavePersonalization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Personalization>) => {
      const uid = await currentUserId();
      const { error } = await supabase
        .from("user_personalization")
        .upsert({ user_id: uid, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useLearningMode(): LearningMode {
  const { data } = usePersonalization();
  return data?.active_learning_mode ?? "beginner";
}
