-- Add WebSub (PubSubHubbub) subscription tracking
-- This stores YouTube channel WebSub subscription states

CREATE TABLE channel_websub_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  youtube_channel_id VARCHAR(255) NOT NULL,
  hub_topic_url TEXT NOT NULL,
  hub_callback_url TEXT NOT NULL,
  hub_lease_seconds INTEGER,
  hub_lease_expires_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- pending, verified, failed, expired
  last_notification_at TIMESTAMP,
  verification_token VARCHAR(255),
  subscribe_attempts INTEGER DEFAULT 0,
  last_subscribe_attempt_at TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_id)
);

-- Index for finding expiring subscriptions
CREATE INDEX idx_websub_expiring ON channel_websub_subscriptions(hub_lease_expires_at)
WHERE status = 'verified' AND hub_lease_expires_at IS NOT NULL;

-- Index for finding failed subscriptions to retry
CREATE INDEX idx_websub_failed ON channel_websub_subscriptions(last_subscribe_attempt_at)
WHERE status = 'failed';

-- Index for YouTube channel ID lookup
CREATE INDEX idx_websub_youtube_channel ON channel_websub_subscriptions(youtube_channel_id);

-- Comments
COMMENT ON TABLE channel_websub_subscriptions IS 'Tracks WebSub (PubSubHubbub) subscriptions for YouTube channels';
COMMENT ON COLUMN channel_websub_subscriptions.hub_topic_url IS 'YouTube RSS feed URL for this channel';
COMMENT ON COLUMN channel_websub_subscriptions.hub_callback_url IS 'Our callback URL where YouTube sends notifications';
COMMENT ON COLUMN channel_websub_subscriptions.hub_lease_seconds IS 'Subscription duration in seconds from YouTube';
COMMENT ON COLUMN channel_websub_subscriptions.hub_lease_expires_at IS 'When this subscription needs to be renewed';
COMMENT ON COLUMN channel_websub_subscriptions.status IS 'Subscription state: pending, verified, failed, expired';
COMMENT ON COLUMN channel_websub_subscriptions.verification_token IS 'Random token for verifying callback ownership';

-- Apply updated_at trigger
CREATE TRIGGER update_websub_subscriptions_updated_at
BEFORE UPDATE ON channel_websub_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (subscriptions are managed by worker, not users)
ALTER TABLE channel_websub_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for monitoring)
CREATE POLICY "WebSub subscriptions are publicly readable"
ON channel_websub_subscriptions
FOR SELECT
USING (true);
