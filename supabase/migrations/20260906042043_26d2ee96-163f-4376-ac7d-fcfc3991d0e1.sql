REVOKE EXECUTE ON FUNCTION public.get_leaderboard(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_social_leaderboard(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_social_leaderboard(text, integer, integer) TO service_role;