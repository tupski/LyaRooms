-- Migration: Update system_settings app_name from "Kakarama Room" to "Lya Rooms"
-- Part of Kakarama to Lya Rooms rebrand
-- Requirements: 5.1, 5.3, 14.1

-- Update the app_name value in system_settings
UPDATE public.system_settings 
SET 
    value = '"Lya Rooms"'::jsonb,
    updated_at = TIMEZONE('utc'::text, NOW())
WHERE key = 'app_name' 
  AND value = '"Kakarama Room"'::jsonb;

-- Verify the update was successful
DO $$
DECLARE
    current_app_name TEXT;
BEGIN
    SELECT value::text INTO current_app_name 
    FROM public.system_settings 
    WHERE key = 'app_name';
    
    IF current_app_name = '"Lya Rooms"' THEN
        RAISE NOTICE 'Migration successful: app_name updated to "Lya Rooms"';
    ELSE
        RAISE WARNING 'Migration may have failed: app_name is currently %', current_app_name;
    END IF;
END $$;
