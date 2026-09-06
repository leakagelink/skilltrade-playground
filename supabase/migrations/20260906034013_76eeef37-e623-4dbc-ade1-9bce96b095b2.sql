CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS show_country boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_public_profile boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('FRIEND','PUBLIC','TOURNAMENT')),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'WAITING_FOR_OPPONENT'
    CHECK (status IN ('DRAFT','WAITING_FOR_OPPONENT','ACTIVE','COMPLETED','EXPIRED','CANCELLED')),
  starting_balance numeric NOT NULL DEFAULT 100000,
  market_category text NOT NULL DEFAULT 'ALL' CHECK (market_category IN ('ALL','STOCK','CRYPTO')),
  duration_days integer NOT NULL DEFAULT 7 CHECK (duration_days BETWEEN 1 AND 30),
  start_time timestamptz,
  end_time timestamptz,
  created_by uuid,
  invite_code text UNIQUE,
  max_participants integer NOT NULL DEFAULT 2 CHECK (max_participants BETWEEN 2 AND 10000),
  is_public boolean NOT NULL DEFAULT false,
  period_key text,
  result_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competition_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  cash numeric NOT NULL DEFAULT 100000,
  equity numeric,
  return_pct numeric,
  score numeric,
  drawdown numeric,
  rank integer,
  rewarded boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.competition_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.competition_participants(id) ON DELETE CASCADE,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  asset_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('BUY','SELL')),
  quantity numeric NOT NULL,
  position_size numeric NOT NULL,
  entry_price numeric NOT NULL,
  current_price numeric,
  exit_price numeric,
  stop_loss numeric,
  take_profit numeric,
  pnl numeric,
  unrealized_pnl numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'OPEN',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;
GRANT SELECT ON public.competition_participants TO authenticated;
GRANT ALL ON public.competition_participants TO service_role;
GRANT SELECT ON public.competition_trades TO authenticated;
GRANT ALL ON public.competition_trades TO service_role;

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public or joined competitions"
  ON public.competitions FOR SELECT TO authenticated
  USING (
    is_public
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.competition_participants p
      WHERE p.competition_id = competitions.id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own participation"
  ON public.competition_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their own competition trades"
  ON public.competition_trades FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.competition_participants p
      WHERE p.id = competition_trades.participant_id AND p.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS competitions_status_kind_idx ON public.competitions (status, kind);
CREATE INDEX IF NOT EXISTS competitions_period_idx ON public.competitions (kind, period_key);
CREATE INDEX IF NOT EXISTS competition_participants_user_idx ON public.competition_participants (user_id);
CREATE INDEX IF NOT EXISTS competition_participants_rank_idx ON public.competition_participants (competition_id, score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS competition_trades_participant_idx ON public.competition_trades (participant_id, status);
CREATE INDEX IF NOT EXISTS profiles_country_idx ON public.profiles (country) WHERE is_leaderboard_visible;

CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_competition_participants_updated_at BEFORE UPDATE ON public.competition_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.badges (code, name, description, icon)
VALUES
  ('competitor', 'Competitor', 'Joined your first virtual trading competition.', 'users'),
  ('friend_challenge_winner', 'Friendly Rival', 'Won a virtual friend challenge.', 'handshake'),
  ('tournament_finisher', 'Tournament Trader', 'Completed a weekly virtual tournament.', 'flag'),
  ('tournament_top10', 'Top 10 Finisher', 'Finished in the top 10 of a weekly virtual tournament.', 'medal')
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_social_leaderboard(_country text DEFAULT NULL, _limit integer DEFAULT 50, _offset integer DEFAULT 0)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  level integer,
  xp integer,
  trading_skill_score integer,
  country text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    p.level,
    p.xp,
    p.trading_skill_score,
    CASE WHEN p.show_country THEN p.country ELSE NULL END
  FROM public.profiles p
  WHERE p.is_leaderboard_visible
    AND p.is_public_profile
    AND (_country IS NULL OR p.country = _country)
  ORDER BY p.trading_skill_score DESC, p.xp DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(_offset, 0), 0)
$$;

REVOKE ALL ON FUNCTION public.get_social_leaderboard(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_social_leaderboard(text, integer, integer) TO authenticated;