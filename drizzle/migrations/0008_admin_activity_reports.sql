CREATE TABLE public.user_activity_days (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 activity_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Kolkata')::date),
 platform text NOT NULL CHECK (platform IN ('web','android','ios')),
 first_seen_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, activity_date, platform)
);
GRANT SELECT ON public.user_activity_days TO authenticated;
GRANT ALL ON public.user_activity_days TO service_role;
ALTER TABLE public.user_activity_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_owner_read ON public.user_activity_days FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX activity_date_idx ON public.user_activity_days(activity_date);
CREATE FUNCTION public.record_user_activity(_platform text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF _platform NOT IN ('web','android','ios') THEN RAISE EXCEPTION 'Invalid platform'; END IF;
 INSERT INTO public.user_activity_days(user_id, platform) SELECT auth.uid(), _platform WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid())
 ON CONFLICT (user_id, activity_date, platform) DO UPDATE SET last_seen_at=now() WHERE user_activity_days.last_seen_at < now()-interval '4 minutes';
END; $$;
REVOKE ALL ON FUNCTION public.record_user_activity(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_user_activity(text) TO authenticated;
CREATE FUNCTION public.get_admin_activity_report(_period text DEFAULT 'day') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE local_now timestamp := now() AT TIME ZONE 'Asia/Kolkata'; start_day date; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF _period NOT IN ('day','week','month','year') THEN RAISE EXCEPTION 'Invalid period'; END IF;
 start_day := date_trunc(_period,local_now)::date;
 WITH periods AS (SELECT period, date_trunc(period,local_now)::date AS begins FROM unnest(ARRAY['day','week','month','year']) period),
 active AS (SELECT a.user_id, max(a.last_seen_at) last_seen_at, array_agg(DISTINCT a.platform) platforms FROM public.user_activity_days a WHERE a.activity_date >= start_day GROUP BY a.user_id)
 SELECT jsonb_build_object(
 'generated_at',now(), 'timezone','Asia/Kolkata', 'period_start',start_day,
 'tracking_started_at',(SELECT min(first_seen_at) FROM public.user_activity_days),
 'total_users',(SELECT count(*) FROM auth.users),
 'periods',(SELECT jsonb_agg(jsonb_build_object('period',p.period,'signups',(SELECT count(*) FROM auth.users u WHERE u.created_at >= p.begins::timestamp AT TIME ZONE 'Asia/Kolkata'),'active_users',(SELECT count(DISTINCT user_id) FROM public.user_activity_days WHERE activity_date >= p.begins))) FROM periods p),
 'active_users',coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',p.id,'username',p.username,'full_name',up.full_name,'country',p.country,'last_seen_at',a.last_seen_at,'platforms',a.platforms) ORDER BY a.last_seen_at DESC) FROM active a JOIN public.profiles p ON p.id=a.user_id LEFT JOIN public.user_personalization up ON up.user_id=p.id),'[]'::jsonb),
 'countries',coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM (SELECT coalesce(nullif(p.country,''),'Not provided') country, count(*) users FROM active a JOIN public.profiles p ON p.id=a.user_id GROUP BY 1 ORDER BY 2 DESC) c),'[]'::jsonb),
 'trend',(SELECT jsonb_agg(jsonb_build_object('date',d::date,'signups',(SELECT count(*) FROM auth.users u WHERE (u.created_at AT TIME ZONE 'Asia/Kolkata')::date=d::date),'active_users',(SELECT count(DISTINCT user_id) FROM public.user_activity_days a WHERE a.activity_date=d::date)) ORDER BY d) FROM generate_series(local_now::date-29,local_now::date,interval '1 day') d)
 ) INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.get_admin_activity_report(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_activity_report(text) TO authenticated;
COMMENT ON TABLE public.user_activity_days IS 'Authenticated foreground activity only; IST calendar days. Not downloads, installs, GPS or continuous presence. Cascades on profile deletion.';