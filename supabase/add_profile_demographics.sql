-- Profile demographics collected during signup.
-- Date of birth remains stored for account/KYC use; public pages should display
-- only calculated age, never the raw date.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS gender_description text;

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS gender_description text;

-- Preserve demographics already present in Auth metadata without replacing
-- values that users have since updated in their profiles.
UPDATE public.users AS u
SET
  gender = COALESCE(u.gender, NULLIF(au.raw_user_meta_data->>'gender', '')),
  gender_description = COALESCE(u.gender_description, NULLIF(au.raw_user_meta_data->>'gender_description', ''))
FROM auth.users AS au
WHERE u.uid = au.id::text
  AND (
    (u.gender IS NULL AND NULLIF(au.raw_user_meta_data->>'gender', '') IS NOT NULL)
    OR (u.gender_description IS NULL AND NULLIF(au.raw_user_meta_data->>'gender_description', '') IS NOT NULL)
  );

UPDATE public.creator_profiles AS cp
SET
  gender = COALESCE(cp.gender, u.gender),
  gender_description = COALESCE(cp.gender_description, u.gender_description),
  dob = COALESCE(cp.dob, u.dob)
FROM public.users AS u
WHERE cp.user_id::text = u.uid
  AND u.role IN ('creator', 'pending_creator', 'suspended_creator')
  AND (
    cp.gender IS NULL
    OR cp.gender_description IS NULL
    OR cp.dob IS NULL
  );

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role TEXT := COALESCE(NULLIF(meta->>'role', ''), 'subscriber');
  v_name TEXT := COALESCE(
    NULLIF(meta->>'name', ''),
    NULLIF(meta->>'full_name', ''),
    split_part(NEW.email, '@', 1),
    'User'
  );
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE uid = NEW.id::text)
     OR (NEW.email IS NOT NULL AND EXISTS (
           SELECT 1 FROM public.users WHERE lower(email) = lower(NEW.email)))
  THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (
    uid, name, email, avatar, phone, role, gender, gender_description, dob
  )
  VALUES (
    NEW.id::text,
    v_name,
    NEW.email,
    COALESCE(meta->>'avatar_url', meta->>'picture'),
    NULLIF(meta->>'phone', ''),
    v_role,
    NULLIF(meta->>'gender', ''),
    NULLIF(meta->>'gender_description', ''),
    CASE
      WHEN meta->>'dob' ~ '^\d{4}-\d{2}-\d{2}$'
       AND to_char(to_date(meta->>'dob', 'YYYY-MM-DD'), 'YYYY-MM-DD') = meta->>'dob'
      THEN to_date(meta->>'dob', 'YYYY-MM-DD')::date
      ELSE NULL
    END
  );

  IF v_role = 'creator' THEN
    BEGIN
      INSERT INTO public.creator_profiles (
        user_id, display_name, gender, gender_description, dob
      )
      VALUES (
        NEW.id,
        v_name,
        NULLIF(meta->>'gender', ''),
        NULLIF(meta->>'gender_description', ''),
        CASE
          WHEN meta->>'dob' ~ '^\d{4}-\d{2}-\d{2}$'
           AND to_char(to_date(meta->>'dob', 'YYYY-MM-DD'), 'YYYY-MM-DD') = meta->>'dob'
          THEN to_date(meta->>'dob', 'YYYY-MM-DD')::date
          ELSE NULL
        END
      )
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'creator_profiles insert failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_auth_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
