CREATE TABLE public.ai_agent_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date),
  free_used BOOLEAN NOT NULL DEFAULT false,
  questions_asked INTEGER NOT NULL DEFAULT 0,
  unlock_ads INTEGER NOT NULL DEFAULT 0,
  first_unlock_at TIMESTAMPTZ,
  unlocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);
GRANT SELECT ON public.ai_agent_usage TO authenticated;
GRANT ALL ON public.ai_agent_usage TO service_role;
ALTER TABLE public.ai_agent_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own ai agent usage" ON public.ai_agent_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ai_agent_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_agent_reports TO authenticated;
GRANT ALL ON public.ai_agent_reports TO service_role;
ALTER TABLE public.ai_agent_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own ai reports" ON public.ai_agent_reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);