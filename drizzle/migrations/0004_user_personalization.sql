CREATE TABLE public.user_personalization (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text CHECK (full_name IS NULL OR char_length(full_name) <= 80),
  mobile text CHECK (mobile IS NULL OR mobile ~ '^\+?[0-9 ]{6,20}$'),
  experience_level text NOT NULL DEFAULT 'beginner' CHECK (experience_level IN ('beginner','intermediate','expert')),
  active_learning_mode text NOT NULL DEFAULT 'beginner' CHECK (active_learning_mode IN ('beginner','intermediate','expert')),
  learning_goal text CHECK (learning_goal IS NULL OR learning_goal IN ('basics','strategies','risk','test_strategy','consistency')),
  preferred_markets text[] NOT NULL DEFAULT '{}' CHECK (preferred_markets <@ ARRAY['us_stocks','indian_stocks','crypto','commodities']::text[]),
  hypothetical_starting_capital_range text CHECK (hypothetical_starting_capital_range IS NULL OR hypothetical_starting_capital_range IN ('unknown','1k_10k','10k_50k','50k_1l','1l_5l','5l_plus','prefer_not')),
  personalization_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_personalization TO authenticated;
GRANT ALL ON public.user_personalization TO service_role;
ALTER TABLE public.user_personalization ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own personalization select" ON public.user_personalization FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own personalization insert" ON public.user_personalization FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own personalization update" ON public.user_personalization FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own personalization delete" ON public.user_personalization FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER user_personalization_updated BEFORE UPDATE ON public.user_personalization FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();