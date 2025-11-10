-- ============================================
-- Migration: Phase 1 - Security Fixes
-- Description: Fix function search_path vulnerability
-- Risk Level: LOW
-- Estimated Time: 5 minutes
-- Rollback: Easy
-- ============================================

-- Fix handle_new_user function to prevent search_path injection
-- Issue: Function has mutable search_path (security vulnerability)
-- Solution: Add 'SET search_path = """ to use fully qualified names
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.users (google_id, email, name, avatar_url)
  VALUES (
    NEW.id::text,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (google_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- ============================================
-- VALIDATION QUERIES
-- ============================================

-- Verify search_path is set correctly
DO $$
DECLARE
  config_value text[];
BEGIN
  SELECT proconfig INTO config_value
  FROM pg_proc
  WHERE proname = 'handle_new_user'
    AND pronamespace = 'public'::regnamespace;

  IF config_value IS NULL OR NOT ('search_path=' = ANY(config_value)) THEN
    RAISE EXCEPTION 'Function search_path not set correctly';
  END IF;

  RAISE NOTICE 'Validation passed: search_path is correctly set';
END $$;

-- ============================================
-- MANUAL ACTION REQUIRED
-- ============================================

-- IMPORTANT: Enable leaked password protection via Dashboard
-- Navigate to: https://supabase.com/dashboard/project/[PROJECT_REF]/auth/providers
-- Settings → Auth → Password Protection
-- Enable: "Prevent sign-ups with compromised passwords"
-- This integrates with HaveIBeenPwned.org to block leaked passwords
-- Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- To rollback, remove the search_path setting:
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- -- SET search_path = '' -- REMOVED
-- AS $function$
-- BEGIN
--   INSERT INTO public.users (google_id, email, name, avatar_url)
--   VALUES (
--     NEW.id::text,
--     NEW.email,
--     NEW.raw_user_meta_data->>'name',
--     NEW.raw_user_meta_data->>'avatar_url'
--   )
--   ON CONFLICT (google_id) DO NOTHING;
--   RETURN NEW;
-- END;
-- $function$;
