REVOKE EXECUTE ON FUNCTION public.redeem_launch_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_launch_code(text) TO service_role;