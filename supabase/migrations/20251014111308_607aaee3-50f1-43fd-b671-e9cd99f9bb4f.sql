-- Fix search path security issue for handle_new_user function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix search path for update_observation_count function
DROP FUNCTION IF EXISTS public.update_observation_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_observation_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET observation_count = observation_count + 1
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET observation_count = observation_count - 1
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_observation_count_trigger
  AFTER INSERT OR DELETE ON public.observations
  FOR EACH ROW EXECUTE FUNCTION public.update_observation_count();