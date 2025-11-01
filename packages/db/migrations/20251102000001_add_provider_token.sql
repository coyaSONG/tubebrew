-- Add provider_token to users table
-- This stores the YouTube OAuth access token for API calls
ALTER TABLE users
ADD COLUMN provider_token TEXT,
ADD COLUMN provider_refresh_token TEXT,
ADD COLUMN provider_token_expires_at TIMESTAMP;

-- Create index for token lookup
CREATE INDEX idx_users_provider_token_expires ON users(provider_token_expires_at)
WHERE provider_token IS NOT NULL;

-- Comment
COMMENT ON COLUMN users.provider_token IS 'OAuth access token for YouTube API';
COMMENT ON COLUMN users.provider_refresh_token IS 'OAuth refresh token for renewing access';
COMMENT ON COLUMN users.provider_token_expires_at IS 'Expiration timestamp for the access token';
