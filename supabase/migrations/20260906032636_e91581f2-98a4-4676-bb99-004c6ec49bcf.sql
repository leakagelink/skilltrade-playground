CREATE TABLE public.career_progress (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL DEFAULT 'BEGINNER',
  career_title TEXT NOT NULL DEFAULT 'Market Explorer',
  specialization TEXT,
  unlocked_specializations TEXT[] NOT NULL DEFAULT '{}',
  career_xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.career_progress TO authenticated;
GRANT ALL ON public.career_progress TO service_role;
ALTER TABLE public.career_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career_progress_select_own" ON public.career_progress FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.career_mission_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_key TEXT NOT NULL,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_key)
);
GRANT SELECT ON public.career_mission_completions TO authenticated;
GRANT ALL ON public.career_mission_completions TO service_role;
ALTER TABLE public.career_mission_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career_missions_select_own" ON public.career_mission_completions FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.career_stage_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, stage_key)
);
GRANT SELECT ON public.career_stage_unlocks TO authenticated;
GRANT ALL ON public.career_stage_unlocks TO service_role;
ALTER TABLE public.career_stage_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career_stage_unlocks_select_own" ON public.career_stage_unlocks FOR SELECT TO authenticated USING (user_id = auth.uid());

INSERT INTO public.badges (code, name, description, icon) VALUES
  ('career_started', 'Career Started', 'Began the simulated Trading Career journey.', 'compass'),
  ('career_risk_aware', 'Risk Aware', 'Completed a simulated trade with a stop loss.', 'shield'),
  ('career_consistency', 'Consistency Builder', 'Stayed active in the simulator across several days.', 'calendar-check'),
  ('career_expert', 'Career Expert', 'Reached the Expert career stage.', 'medal'),
  ('career_legend', 'Legend Status', 'Reached the Legend career stage.', 'crown')
ON CONFLICT (code) DO NOTHING;