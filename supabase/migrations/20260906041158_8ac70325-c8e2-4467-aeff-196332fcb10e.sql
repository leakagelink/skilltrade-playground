CREATE TABLE public.user_ad_activity (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  rewarded_ads_completed INTEGER NOT NULL DEFAULT 0,
  interstitial_ads_shown INTEGER NOT NULL DEFAULT 0,
  ai_coach_rewards INTEGER NOT NULL DEFAULT 0,
  career_rewards INTEGER NOT NULL DEFAULT 0,
  arena_rewards INTEGER NOT NULL DEFAULT 0,
  bonus_ai_analyses INTEGER NOT NULL DEFAULT 0,
  last_interstitial_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_date)
);

GRANT SELECT ON public.user_ad_activity TO authenticated;
GRANT ALL ON public.user_ad_activity TO service_role;
ALTER TABLE public.user_ad_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own ad activity"
  ON public.user_ad_activity FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_ad_activity_updated_at
  BEFORE UPDATE ON public.user_ad_activity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ad_reward_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  placement TEXT NOT NULL,
  nonce TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  reward_type TEXT NOT NULL,
  reward_amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ad_reward_grants_user ON public.ad_reward_grants (user_id, created_at DESC);

GRANT SELECT ON public.ad_reward_grants TO authenticated;
GRANT ALL ON public.ad_reward_grants TO service_role;
ALTER TABLE public.ad_reward_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own ad reward grants"
  ON public.ad_reward_grants FOR SELECT TO authenticated
  USING (auth.uid() = user_id);