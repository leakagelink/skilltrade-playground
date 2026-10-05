CREATE TABLE public.strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  market text NOT NULL DEFAULT 'any',
  timeframe text NOT NULL DEFAULT '1D',
  entry_conditions text,
  exit_conditions text,
  stop_loss_rule text,
  take_profit_rule text,
  risk_rule text,
  position_sizing_rule text,
  notes text,
  requires_stop_loss boolean NOT NULL DEFAULT true,
  requires_take_profit boolean NOT NULL DEFAULT false,
  max_position_pct numeric CHECK (max_position_pct IS NULL OR (max_position_pct > 0 AND max_position_pct <= 100)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategies TO authenticated;
GRANT ALL ON public.strategies TO service_role;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own strategies select" ON public.strategies FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own strategies insert" ON public.strategies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own strategies update" ON public.strategies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own strategies delete" ON public.strategies FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER strategies_updated_at BEFORE UPDATE ON public.strategies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();