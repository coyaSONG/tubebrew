-- Add INSERT policy for user_settings table
-- This allows users to create their own settings
CREATE POLICY "Users can create own settings" ON user_settings
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE google_id = auth.uid()::text));
