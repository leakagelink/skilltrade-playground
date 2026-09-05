CREATE TABLE public.ai_trade_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'lovable-ai',
  risk_management_score INT NOT NULL DEFAULT 0,
  discipline_score INT NOT NULL DEFAULT 0,
  timing_score INT NOT NULL DEFAULT 0,
  consistency_score INT NOT NULL DEFAULT 0,
  summary TEXT NOT NULL,
  strengths TEXT[] NOT NULL DEFAULT '{}',
  areas_to_review TEXT[] NOT NULL DEFAULT '{}',
  detected_patterns TEXT[] NOT NULL DEFAULT '{}',
  educational_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trade_id)
);
CREATE INDEX ai_trade_reviews_user_created_idx ON public.ai_trade_reviews (user_id, created_at DESC);
GRANT SELECT ON public.ai_trade_reviews TO authenticated;
GRANT ALL ON public.ai_trade_reviews TO service_role;
ALTER TABLE public.ai_trade_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai reviews select" ON public.ai_trade_reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.trader_dna_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_control_score INT NOT NULL DEFAULT 0,
  discipline_score INT NOT NULL DEFAULT 0,
  consistency_score INT NOT NULL DEFAULT 0,
  patience_score INT NOT NULL DEFAULT 0,
  position_size_management_score INT NOT NULL DEFAULT 0,
  activity_level TEXT NOT NULL DEFAULT 'LOW',
  personality TEXT NOT NULL DEFAULT 'Strategy Explorer',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trader_dna_profiles TO authenticated;
GRANT ALL ON public.trader_dna_profiles TO service_role;
ALTER TABLE public.trader_dna_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trader dna select" ON public.trader_dna_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.badges (code,name,description,icon) VALUES
('ai_explorer','AI Explorer','Requested your first educational AI review of a simulated trade.','sparkles'),
('trader_dna_unlocked','Trader DNA Unlocked','Generated your Trader DNA from simulated trading activity.','dna'),
('consistency_explorer','Consistency Explorer','Reached a Trader DNA consistency score of 70 or higher.','activity')
ON CONFLICT (code) DO NOTHING;