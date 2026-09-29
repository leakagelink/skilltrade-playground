CREATE TABLE public.trade_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  thesis text, strategy text, entry_reason text, exit_reason text,
  went_well text, improve text, emotion text, confidence smallint, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, trade_id),
  CHECK (confidence IS NULL OR confidence BETWEEN 1 AND 5),
  CHECK (emotion IS NULL OR emotion IN ('Calm','Confident','Unsure','Impulsive','Patient'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_journals TO authenticated;
GRANT ALL ON public.trade_journals TO service_role;
ALTER TABLE public.trade_journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journals select" ON public.trade_journals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own journals insert" ON public.trade_journals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.trades t WHERE t.id = trade_id AND t.user_id = auth.uid()));
CREATE POLICY "own journals update" ON public.trade_journals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own journals delete" ON public.trade_journals FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX trade_journals_user_idx ON public.trade_journals(user_id, updated_at DESC);
CREATE TRIGGER update_trade_journals_updated_at BEFORE UPDATE ON public.trade_journals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();