-- ============================================
-- Migration: Phase 3 - Optimize RLS Policies
-- Description: Wrap auth.uid() calls in SELECT to enable initPlan optimization
-- Risk Level: LOW
-- Estimated Time: 10 minutes
-- Rollback: Easy
-- Impact: Up to 99.78% performance improvement (per Supabase docs)
-- ============================================

-- Issue: auth.uid() is re-evaluated for each row causing performance degradation
-- Solution: Wrap auth functions in (select ...) to enable Postgres initPlan caching
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security
-- Affects: 18 policies across 5 tables (users, user_settings, user_channels, bookmarks, watch_history)

-- ============================================
-- USERS TABLE - 4 Policies
-- ============================================

-- Policy: Users can view own data
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT
  TO public
  USING ((select auth.uid())::text = google_id::text);

-- Policy: Users can update own data
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE
  TO public
  USING ((select auth.uid())::text = google_id::text);

-- Policy: Users can insert own data
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT
  TO public
  WITH CHECK ((select auth.uid())::text = id::text);

-- Policy: Users can create own data
DROP POLICY IF EXISTS "Users can create own data" ON public.users;
CREATE POLICY "Users can create own data" ON public.users
  FOR INSERT
  TO public
  WITH CHECK ((select auth.uid())::text = google_id::text);

-- ============================================
-- USER_SETTINGS TABLE - 4 Policies
-- ============================================

-- Policy: Users can view own settings
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT
  TO public
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE google_id::text = (select auth.uid())::text
    )
  );

-- Policy: Users can update own settings
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE
  TO public
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE google_id::text = (select auth.uid())::text
    )
  );

-- Policy: Users can insert own settings
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT
  TO public
  WITH CHECK ((select auth.uid())::text = user_id::text);

-- Policy: Users can create own settings
DROP POLICY IF EXISTS "Users can create own settings" ON public.user_settings;
CREATE POLICY "Users can create own settings" ON public.user_settings
  FOR INSERT
  TO public
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users
      WHERE google_id::text = (select auth.uid())::text
    )
  );

-- ============================================
-- USER_CHANNELS TABLE - 2 Policies
-- ============================================

-- Policy: Users can view own channels
DROP POLICY IF EXISTS "Users can view own channels" ON public.user_channels;
CREATE POLICY "Users can view own channels" ON public.user_channels
  FOR SELECT
  TO public
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE google_id::text = (select auth.uid())::text
    )
  );

-- Policy: Users can manage own channels
DROP POLICY IF EXISTS "Users can manage own channels" ON public.user_channels;
CREATE POLICY "Users can manage own channels" ON public.user_channels
  FOR ALL
  TO public
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE google_id::text = (select auth.uid())::text
    )
  );

-- ============================================
-- BOOKMARKS TABLE - 2 Policies
-- ============================================

-- Policy: Users can view own bookmarks
DROP POLICY IF EXISTS "Users can view own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks
  FOR SELECT
  TO public
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE google_id::text = (select auth.uid())::text
    )
  );

-- Policy: Users can manage own bookmarks
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks
  FOR ALL
  TO public
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE google_id::text = (select auth.uid())::text
    )
  );

-- ============================================
-- WATCH_HISTORY TABLE - 2 Policies
-- ============================================

-- Policy: Users can view own history
DROP POLICY IF EXISTS "Users can view own history" ON public.watch_history;
CREATE POLICY "Users can view own history" ON public.watch_history
  FOR SELECT
  TO public
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE google_id::text = (select auth.uid())::text
    )
  );

-- Policy: Users can manage own history
DROP POLICY IF EXISTS "Users can manage own history" ON public.watch_history;
CREATE POLICY "Users can manage own history" ON public.watch_history
  FOR ALL
  TO public
  USING (
    user_id IN (
      SELECT id FROM public.users
      WHERE google_id::text = (select auth.uid())::text
    )
  );

-- ============================================
-- VALIDATION QUERIES
-- ============================================

-- Verify all policies use (select auth.uid()) pattern
DO $$
DECLARE
  unoptimized_policies text[];
BEGIN
  SELECT array_agg(policyname || ' on ' || tablename)
  INTO unoptimized_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('users', 'user_settings', 'user_channels', 'bookmarks', 'watch_history')
    AND (
      (qual IS NOT NULL AND qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(select auth.uid())%')
      OR
      (with_check IS NOT NULL AND with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%')
    );

  IF array_length(unoptimized_policies, 1) > 0 THEN
    RAISE WARNING 'Unoptimized policies found: %', array_to_string(unoptimized_policies, ', ');
  ELSE
    RAISE NOTICE 'Validation passed: All policies optimized with (select auth.uid())';
  END IF;
END $$;

-- Display all optimized policies
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual LIKE '%(select auth.uid())%' OR with_check LIKE '%(select auth.uid())%'
    THEN '✅ Optimized'
    ELSE '❌ Not Optimized'
  END as optimization_status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_settings', 'user_channels', 'bookmarks', 'watch_history')
ORDER BY tablename, policyname;

-- ============================================
-- PERFORMANCE TESTING
-- ============================================

-- Use EXPLAIN ANALYZE to verify initPlan optimization
-- Example query - run before and after migration to compare
-- EXPLAIN ANALYZE
-- SELECT * FROM bookmarks
-- WHERE user_id IN (
--   SELECT id FROM users WHERE google_id::text = auth.uid()::text
-- );
--
-- Look for "InitPlan" in the query plan - this indicates the optimization is working

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- To rollback, remove the (select ...) wrapper from all policies
-- This will revert to the original non-optimized pattern
-- See original migration for the previous policy definitions
