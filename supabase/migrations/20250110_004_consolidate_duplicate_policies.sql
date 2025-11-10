-- ============================================
-- Migration: Phase 4 - Consolidate Duplicate Policies
-- Description: Remove redundant policies to improve performance
-- Risk Level: MEDIUM
-- Estimated Time: 15 minutes
-- Rollback: Medium difficulty
-- ============================================

-- IMPORTANT: THIS MIGRATION IS OPTIONAL
-- Only proceed after thorough testing in a staging environment
-- The duplicate policies are functionally redundant but provide no harm
-- Removing them will slightly improve policy evaluation performance

-- Issue: Multiple permissive policies for same role/action combinations
-- Solution: Keep ALL policies (which include SELECT), remove redundant SELECT-only policies
--          Merge duplicate INSERT policies with OR logic
-- Affected: 16 policy conflicts across 5 tables
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

-- ============================================
-- STRATEGY EXPLANATION
-- ============================================

-- For tables with both "view" (SELECT) and "manage" (ALL) policies:
--   - ALL policy already covers SELECT, INSERT, UPDATE, DELETE
--   - Remove redundant SELECT-only policies
--   - Affected: bookmarks, user_channels, watch_history

-- For tables with duplicate INSERT policies:
--   - Merge both policies into one with OR logic
--   - This preserves both authentication patterns
--   - Affected: users, user_settings

-- ============================================
-- BACKUP POLICIES (for rollback reference)
-- ============================================

-- Store current policy definitions in a comment for easy rollback
/*
CURRENT POLICIES BEING REMOVED:

bookmarks:
  - "Users can view own bookmarks" (SELECT) - redundant with ALL policy

user_channels:
  - "Users can view own channels" (SELECT) - redundant with ALL policy

watch_history:
  - "Users can view own history" (SELECT) - redundant with ALL policy

users:
  - "Users can insert own data" (INSERT with id check)
  - "Users can create own data" (INSERT with google_id check)
  → Merged into single policy with OR condition

user_settings:
  - "Users can insert own settings" (INSERT with direct user_id check)
  - "Users can create own settings" (INSERT with subquery check)
  → Merged into single policy with OR condition
*/

-- ============================================
-- REMOVE REDUNDANT SELECT POLICIES
-- ============================================

-- BOOKMARKS: Remove SELECT policy (ALL policy covers it)
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
-- Keep: "Users can manage own bookmarks" (ALL)

-- USER_CHANNELS: Remove SELECT policy (ALL policy covers it)
DROP POLICY IF EXISTS "Users can view own channels" ON public.user_channels;
-- Keep: "Users can manage own channels" (ALL)

-- WATCH_HISTORY: Remove SELECT policy (ALL policy covers it)
DROP POLICY IF EXISTS "Users can view own history" ON public.watch_history;
-- Keep: "Users can manage own history" (ALL)

-- ============================================
-- MERGE DUPLICATE INSERT POLICIES
-- ============================================

-- USERS TABLE: Merge two INSERT policies
-- Original policies had different authentication checks:
--   1. Checks if auth.uid() matches users.id (UUID comparison)
--   2. Checks if auth.uid() matches users.google_id (text comparison)
-- Merged policy uses OR to support both patterns

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can create own data" ON public.users;

CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT
  TO public
  WITH CHECK (
    -- Support both authentication patterns with OR
    (select auth.uid())::text = id::text
    OR (select auth.uid())::text = google_id::text
  );

-- USER_SETTINGS TABLE: Merge two INSERT policies
-- Original policies had different authentication checks:
--   1. Direct user_id comparison with auth.uid()
--   2. Subquery lookup through users table
-- Merged policy uses OR to support both patterns

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can create own settings" ON public.user_settings;

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT
  TO public
  WITH CHECK (
    -- Support both authentication patterns with OR
    (select auth.uid())::text = user_id::text
    OR user_id IN (
      SELECT id FROM public.users
      WHERE google_id::text = (select auth.uid())::text
    )
  );

-- ============================================
-- VALIDATION QUERIES
-- ============================================

-- Count remaining policies per table
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_settings', 'user_channels', 'bookmarks', 'watch_history')
GROUP BY tablename
ORDER BY tablename;

-- Expected counts after consolidation:
-- bookmarks: 1 (was 2)
-- user_channels: 1 (was 2)
-- user_settings: 3 (was 4)
-- users: 3 (was 4)
-- watch_history: 1 (was 2)
-- Total: 9 policies (was 14)

-- Check for multiple permissive policies (should be 0)
SELECT
  tablename,
  cmd,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_settings', 'user_channels', 'bookmarks', 'watch_history')
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)

-- Display final policy structure
SELECT
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_settings', 'user_channels', 'bookmarks', 'watch_history')
ORDER BY tablename, cmd, policyname;

-- ============================================
-- TESTING CHECKLIST
-- ============================================

/*
CRITICAL: Test the following scenarios before deploying to production

1. SELECT Operations:
   ✓ Users can view their own data
   ✓ Users cannot view other users' data

2. INSERT Operations:
   ✓ Users can insert their own records
   ✓ Users cannot insert records for other users

3. UPDATE Operations:
   ✓ Users can update their own data
   ✓ Users cannot update other users' data

4. DELETE Operations:
   ✓ Users can delete their own data
   ✓ Users cannot delete other users' data

Test SQL Examples:
-----------------

-- Test SELECT (should succeed)
SELECT * FROM bookmarks WHERE user_id = (SELECT id FROM users WHERE google_id = auth.uid()::text);

-- Test INSERT (should succeed)
INSERT INTO bookmarks (user_id, video_id, priority)
VALUES ((SELECT id FROM users WHERE google_id = auth.uid()::text), 'test-video-id', 1);

-- Test UPDATE (should succeed)
UPDATE user_settings SET summary_level = 3
WHERE user_id = (SELECT id FROM users WHERE google_id = auth.uid()::text);

-- Test DELETE (should succeed)
DELETE FROM bookmarks
WHERE user_id = (SELECT id FROM users WHERE google_id = auth.uid()::text);
*/

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================

/*
To rollback this migration, restore the original policies:

-- BOOKMARKS: Restore SELECT policy
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks
  FOR SELECT TO public
  USING (user_id IN (SELECT id FROM public.users WHERE google_id::text = (select auth.uid())::text));

-- USER_CHANNELS: Restore SELECT policy
CREATE POLICY "Users can view own channels" ON public.user_channels
  FOR SELECT TO public
  USING (user_id IN (SELECT id FROM public.users WHERE google_id::text = (select auth.uid())::text));

-- WATCH_HISTORY: Restore SELECT policy
CREATE POLICY "Users can view own history" ON public.watch_history
  FOR SELECT TO public
  USING (user_id IN (SELECT id FROM public.users WHERE google_id::text = (select auth.uid())::text));

-- USERS: Restore two separate INSERT policies
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT TO public
  WITH CHECK ((select auth.uid())::text = id::text);

CREATE POLICY "Users can create own data" ON public.users
  FOR INSERT TO public
  WITH CHECK ((select auth.uid())::text = google_id::text);

-- USER_SETTINGS: Restore two separate INSERT policies
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;

CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT TO public
  WITH CHECK ((select auth.uid())::text = user_id::text);

CREATE POLICY "Users can create own settings" ON public.user_settings
  FOR INSERT TO public
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE google_id::text = (select auth.uid())::text));
*/
