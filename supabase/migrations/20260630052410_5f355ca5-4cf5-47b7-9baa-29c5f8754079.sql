
CREATE OR REPLACE FUNCTION public.grant_admin_to_ralph()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'ralphposadas29@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_ralph ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_ralph
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_to_ralph();

DROP TRIGGER IF EXISTS on_auth_user_updated_grant_ralph ON auth.users;
CREATE TRIGGER on_auth_user_updated_grant_ralph
AFTER UPDATE OF email, email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_admin_to_ralph();

-- Grant immediately if the user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = 'ralphposadas29@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
