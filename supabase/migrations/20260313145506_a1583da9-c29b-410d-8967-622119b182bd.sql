CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'username'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  
  -- Update birth_date if provided
  IF NEW.raw_user_meta_data ->> 'birth_date' IS NOT NULL THEN
    UPDATE public.profiles 
    SET birth_date = (NEW.raw_user_meta_data ->> 'birth_date')::date 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;