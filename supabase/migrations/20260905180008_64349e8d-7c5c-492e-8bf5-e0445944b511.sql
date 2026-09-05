CREATE TABLE public.ai_arena_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  starting_balance NUMERIC NOT NULL DEFAULT 100000,
  user_cash NUMERIC NOT NULL DEFAULT 100000,
  ai_cash NUMERIC NOT NULL DEFAULT 100000,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ NOT NULL,
  last_bot_tick_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_score NUMERIC,
  ai_score NUMERIC,
  user_return NUMERIC,
  ai_return NUMERIC,
  winner TEXT,
  result_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ai_arena_sessions_user_idx ON public.ai_arena_sessions (user_id, status);

GRANT SELECT ON public.ai_arena_sessions TO authenticated;
GRANT ALL ON public.ai_arena_sessions TO service_role;
ALTER TABLE public.ai_arena_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own arena sessions select" ON public.ai_arena_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.arena_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  arena_session_id UUID NOT NULL REFERENCES public.ai_arena_sessions(id) ON DELETE CASCADE,
  owner_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  position_size NUMERIC NOT NULL,
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC,
  exit_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  status TEXT NOT NULL DEFAULT 'OPEN',
  pnl NUMERIC,
  unrealized_pnl NUMERIC DEFAULT 0,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX arena_trades_session_idx ON public.arena_trades (arena_session_id, owner_type, status);

GRANT SELECT ON public.arena_trades TO authenticated;
GRANT ALL ON public.arena_trades TO service_role;
ALTER TABLE public.arena_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own arena trades select" ON public.arena_trades
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.ai_arena_sessions s
      WHERE s.id = arena_trades.arena_session_id AND s.user_id = auth.uid()
    )
  );

INSERT INTO public.badges (code,name,description,icon) VALUES
  ('ai_challenger','AI Challenger','Complete your first AI Arena challenge.','swords'),
  ('ai_slayer','AI Slayer','Defeat an AI Arena opponent.','trophy'),
  ('alpha_breaker','Alpha Breaker','Defeat ALPHA in the AI Arena.','shield'),
  ('nova_breaker','Nova Breaker','Defeat NOVA in the AI Arena.','flame'),
  ('quant_breaker','Quant Breaker','Defeat QUANT in the AI Arena.','sigma'),
  ('titan_breaker','Titan Breaker','Defeat TITAN in the AI Arena.','mountain'),
  ('ai_master','AI Master','Win three or more AI Arena challenges.','crown')
ON CONFLICT (code) DO NOTHING;