CREATE OR REPLACE FUNCTION public.normalize_mobile(_m text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _m IS NULL OR regexp_replace(_m, '[^0-9]', '', 'g') = '' THEN NULL
    WHEN length(regexp_replace(_m, '[^0-9]', '', 'g')) = 10 THEN '91' || regexp_replace(_m, '[^0-9]', '', 'g')
    ELSE regexp_replace(_m, '[^0-9]', '', 'g')
  END
$$;

CREATE TABLE IF NOT EXISTS public.user_mobiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mobile text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.user_mobiles TO service_role;
ALTER TABLE public.user_mobiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.sync_user_mobile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nm text := public.normalize_mobile(NEW.mobile);
BEGIN
  IF nm IS NULL THEN
    DELETE FROM public.user_mobiles WHERE user_id = NEW.user_id;
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_mobiles WHERE mobile = nm AND user_id <> NEW.user_id) THEN
    RAISE EXCEPTION 'mobile_in_use';
  END IF;
  INSERT INTO public.user_mobiles (user_id, mobile) VALUES (NEW.user_id, nm)
  ON CONFLICT (user_id) DO UPDATE SET mobile = EXCLUDED.mobile;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS user_personalization_sync_mobile ON public.user_personalization;
CREATE TRIGGER user_personalization_sync_mobile
AFTER INSERT OR UPDATE OF mobile ON public.user_personalization
FOR EACH ROW EXECUTE FUNCTION public.sync_user_mobile();

INSERT INTO public.user_mobiles (user_id, mobile)
SELECT DISTINCT ON (public.normalize_mobile(mobile)) user_id, public.normalize_mobile(mobile)
FROM public.user_personalization
WHERE public.normalize_mobile(mobile) IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  base_name TEXT;
  final_name TEXT;
  i INT := 0;
  nm TEXT;
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
  nm := public.normalize_mobile(NEW.raw_user_meta_data->>'mobile');
  IF nm IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.user_mobiles WHERE mobile = nm) THEN
      RAISE EXCEPTION 'mobile_in_use';
    END IF;
    INSERT INTO public.user_mobiles (user_id, mobile) VALUES (NEW.id, nm);
  END IF;
  RETURN NEW;
END; $function$;