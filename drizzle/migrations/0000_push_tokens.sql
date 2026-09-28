CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX push_tokens_user_idx ON public.push_tokens(user_id);
GRANT SELECT, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own push tokens" ON public.push_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own push tokens" ON public.push_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'tradevirt-daily-reminders',
  '30 3,13 * * *',
  $$ SELECT net.http_post(
       url := 'https://project--01a23b15-a2d6-4d42-8adf-10aa7047f8d3.lovable.app/api/public/notify-reminders',
       headers := '{"Content-Type":"application/json"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);