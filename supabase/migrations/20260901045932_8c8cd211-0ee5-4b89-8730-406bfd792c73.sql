
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_economy() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_leaderboard(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(TEXT, INT) TO authenticated;
