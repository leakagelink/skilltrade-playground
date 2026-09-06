CREATE OR REPLACE FUNCTION public.prevent_profile_privileged_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / internal (no JWT role or service_role) bypasses this guard
  IF coalesce(current_setting('request.jwt.claims', true)::json->>'role', '') <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NEW.virtual_balance IS DISTINCT FROM OLD.virtual_balance
     OR NEW.virtual_credits IS DISTINCT FROM OLD.virtual_credits
     OR NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.trading_skill_score IS DISTINCT FROM OLD.trading_skill_score THEN
    RAISE EXCEPTION 'Game progression fields cannot be modified directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privileged_updates ON public.profiles;
CREATE TRIGGER prevent_profile_privileged_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privileged_updates();