
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  trading_skill_score INT NOT NULL DEFAULT 0,
  virtual_balance NUMERIC(20,2) NOT NULL DEFAULT 100000,
  virtual_credits INT NOT NULL DEFAULT 5,
  is_leaderboard_visible BOOLEAN NOT NULL DEFAULT true,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT username_length CHECK (char_length(username) BETWEEN 3 AND 20)
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Prevent client-side manipulation of economy columns
CREATE OR REPLACE FUNCTION public.protect_profile_economy()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  NEW.level := OLD.level;
  NEW.xp := OLD.xp;
  NEW.trading_skill_score := OLD.trading_skill_score;
  NEW.virtual_balance := OLD.virtual_balance;
  NEW.virtual_credits := OLD.virtual_credits;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER protect_profile_economy BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_economy();

-- ASSETS
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('STOCK','CRYPTO')),
  display_symbol TEXT NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assets TO authenticated, anon;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets readable" ON public.assets FOR SELECT TO authenticated, anon USING (is_active);

INSERT INTO public.assets (symbol, name, asset_type, display_symbol) VALUES
('AAPL','Apple Inc.','STOCK','AAPL/USD'),
('MSFT','Microsoft','STOCK','MSFT/USD'),
('NVDA','NVIDIA','STOCK','NVDA/USD'),
('TSLA','Tesla','STOCK','TSLA/USD'),
('AMZN','Amazon','STOCK','AMZN/USD'),
('BTC','Bitcoin','CRYPTO','BTC/USD'),
('ETH','Ethereum','CRYPTO','ETH/USD'),
('SOL','Solana','CRYPTO','SOL/USD');

-- TRADES
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id),
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('BUY','SELL')),
  entry_price NUMERIC(20,8) NOT NULL,
  current_price NUMERIC(20,8),
  exit_price NUMERIC(20,8),
  position_size NUMERIC(20,2) NOT NULL,
  stop_loss NUMERIC(20,8),
  take_profit NUMERIC(20,8),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED','STOP_LOSS_HIT','TAKE_PROFIT_HIT')),
  realized_pnl NUMERIC(20,2),
  unrealized_pnl NUMERIC(20,2),
  notes TEXT,
  review TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX trades_user_idx ON public.trades(user_id, opened_at DESC);
GRANT SELECT ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trades select" ON public.trades FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- CREDIT TRANSACTIONS
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CREDIT','DEBIT')),
  amount INT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own credits select" ON public.credit_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- XP TRANSACTIONS
CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.xp_transactions TO authenticated;
GRANT ALL ON public.xp_transactions TO service_role;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own xp select" ON public.xp_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- DAILY REWARDS
CREATE TABLE public.daily_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_claim_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX daily_rewards_user_idx ON public.daily_rewards(user_id, claimed_at DESC);
GRANT SELECT ON public.daily_rewards TO authenticated;
GRANT ALL ON public.daily_rewards TO service_role;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rewards select" ON public.daily_rewards FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- CHALLENGES
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('DAILY','WEEKLY')),
  metric TEXT NOT NULL,
  target NUMERIC NOT NULL DEFAULT 1,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  reward_xp INT NOT NULL DEFAULT 50,
  reward_credits INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges readable" ON public.challenges FOR SELECT TO authenticated USING (is_active);

INSERT INTO public.challenges (code,title,description,challenge_type,metric,target,reward_xp,reward_credits) VALUES
('daily_two_trades','Complete 2 trades today','Open and close two simulated trades today.','DAILY','closed_trades_today',2,50,1),
('daily_stop_loss','Use a stop loss','Open one simulated trade that includes a stop loss.','DAILY','sl_trades_today',1,50,1),
('daily_disciplined','One disciplined trade','Close a trade that used both a stop loss and a take profit.','DAILY','disciplined_trades_today',1,60,1),
('weekly_five_disciplined','Complete 5 disciplined trades','Close five trades this week using stop loss and take profit.','WEEKLY','disciplined_trades_week',5,200,3),
('weekly_positive_rr','Positive risk/reward','Close three trades this week with a risk/reward above 1.5.','WEEKLY','good_rr_trades_week',3,150,2);

-- USER CHALLENGES
CREATE TABLE public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  progress NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','COMPLETED')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, period_key)
);
GRANT SELECT ON public.user_challenges TO authenticated;
GRANT ALL ON public.user_challenges TO service_role;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_challenges select" ON public.user_challenges FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- BADGES
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges readable" ON public.badges FOR SELECT TO authenticated USING (true);

INSERT INTO public.badges (code,name,description,icon) VALUES
('first_trade','First Trade','Opened your first simulated trade.','rocket'),
('ten_trades','10 Trades Completed','Closed ten simulated trades.','layers'),
('disciplined_trader','Disciplined Trader','Closed 5 trades using both stop loss and take profit.','shield'),
('risk_manager','Risk Manager','Kept risk below 5% of virtual balance on 10 trades.','shield-check'),
('consistent_trader','Consistent Trader','Reached a Trading Skill Score of 600.','trending-up'),
('challenge_winner','Challenge Winner','Completed your first challenge.','trophy');

-- USER BADGES
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
GRANT SELECT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own badges select" ON public.user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- LEADERBOARD SNAPSHOTS
CREATE TABLE public.leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('DAILY','WEEKLY','ALL_TIME')),
  rank INT NOT NULL,
  trading_skill_score INT NOT NULL,
  consistency_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leaderboard_snapshots TO authenticated;
GRANT ALL ON public.leaderboard_snapshots TO service_role;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own snapshots select" ON public.leaderboard_snapshots FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  kind TEXT NOT NULL DEFAULT 'INFO',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_name TEXT;
  final_name TEXT;
  i INT := 0;
BEGIN
  base_name := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1), 'trader'), '[^a-zA-Z0-9_]', '', 'g'));
  IF char_length(base_name) < 3 THEN base_name := 'trader' || base_name; END IF;
  base_name := left(base_name, 16);
  final_name := base_name;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_name) LOOP
    i := i + 1;
    final_name := base_name || i::text;
  END LOOP;
  INSERT INTO public.profiles (id, username) VALUES (NEW.id, final_name);
  INSERT INTO public.credit_transactions (user_id, transaction_type, amount, source)
  VALUES (NEW.id, 'CREDIT', 5, 'SIGNUP_BONUS');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PUBLIC LEADERBOARD (limited columns only)
CREATE OR REPLACE FUNCTION public.get_leaderboard(_period TEXT DEFAULT 'ALL_TIME', _limit INT DEFAULT 50)
RETURNS TABLE (rank BIGINT, user_id UUID, username TEXT, avatar_url TEXT, level INT, trading_skill_score INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ROW_NUMBER() OVER (ORDER BY p.trading_skill_score DESC, p.xp DESC) AS rank,
         p.id, p.username, p.avatar_url, p.level, p.trading_skill_score
  FROM public.profiles p
  WHERE p.is_leaderboard_visible = true
    AND (
      _period = 'ALL_TIME'
      OR EXISTS (
        SELECT 1 FROM public.trades t
        WHERE t.user_id = p.id
          AND t.opened_at >= CASE WHEN _period = 'DAILY' THEN now() - interval '1 day' ELSE now() - interval '7 days' END
      )
    )
  ORDER BY p.trading_skill_score DESC, p.xp DESC
  LIMIT _limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(TEXT, INT) TO authenticated;
