CREATE TABLE public.play_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id text NOT NULL CHECK (product_id IN ('tradevirt_basic','tradevirt_pro','tradevirt_elite')),
  base_plan_id text,
  purchase_token_hash text NOT NULL UNIQUE,
  purchase_token text NOT NULL,
  status text NOT NULL,
  started_at timestamptz,
  expires_at timestamptz,
  auto_renewing boolean,
  acknowledged boolean NOT NULL DEFAULT false,
  latest_order_id text,
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX play_subscriptions_user_idx ON public.play_subscriptions(user_id, expires_at DESC);
GRANT ALL ON public.play_subscriptions TO service_role;
ALTER TABLE public.play_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER play_subscriptions_updated BEFORE UPDATE ON public.play_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();