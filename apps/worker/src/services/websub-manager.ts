import crypto from 'crypto';
import { supabaseAdmin } from '@tubebrew/db';
import type { Logger } from 'pino';

const YOUTUBE_HUB_URL = 'https://pubsubhubbub.appspot.com/subscribe';

interface SubscribeOptions {
  youtubeChannelId: string;
  channelDbId: string;
  callbackUrl: string;
  mode: 'subscribe' | 'unsubscribe';
}

export class WebSubManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Subscribe to WebSub notifications for a YouTube channel
   */
  async subscribe(options: SubscribeOptions): Promise<boolean> {
    const { youtubeChannelId, channelDbId, callbackUrl, mode } = options;

    const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${youtubeChannelId}`;

    this.logger.info({ youtubeChannelId, mode }, 'Subscribing to WebSub');

    try {
      // Create or update subscription record
      if (mode === 'subscribe') {
        // @ts-ignore - channel_websub_subscriptions not in generated types yet
        const { error: upsertError } = await (supabaseAdmin as any)
          .from('channel_websub_subscriptions')
          .upsert({
            channel_id: channelDbId,
            youtube_channel_id: youtubeChannelId,
            hub_topic_url: topicUrl,
            hub_callback_url: callbackUrl,
            status: 'pending',
            subscribe_attempts: 1,
            last_subscribe_attempt_at: new Date().toISOString(),
          }, {
            onConflict: 'channel_id',
            ignoreDuplicates: false,
          })
          .select()
          .single();

        if (upsertError) {
          this.logger.error({ error: upsertError, youtubeChannelId }, 'Failed to create subscription record');
          return false;
        }
      }

      // Send subscription request to YouTube hub
      const params = new URLSearchParams({
        'hub.callback': callbackUrl,
        'hub.topic': topicUrl,
        'hub.mode': mode,
        'hub.verify': 'sync', // Synchronous verification
      });

      const response = await fetch(YOUTUBE_HUB_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          { status: response.status, error: errorText, youtubeChannelId },
          'WebSub subscription request failed'
        );

        // Update subscription record with error
        // @ts-ignore - channel_websub_subscriptions not in generated types yet
        await (supabaseAdmin as any)
          .from('channel_websub_subscriptions')
          .update({
            status: 'failed',
            last_error: `HTTP ${response.status}: ${errorText}`,
          })
          .eq('youtube_channel_id', youtubeChannelId);

        return false;
      }

      this.logger.info({ youtubeChannelId, mode }, 'WebSub subscription request successful');
      return true;
    } catch (error) {
      this.logger.error({ error: (error as Error).message, youtubeChannelId }, 'Error subscribing to WebSub');

      // Update subscription record with error
      // @ts-ignore - channel_websub_subscriptions not in generated types yet
      await (supabaseAdmin as any)
        .from('channel_websub_subscriptions')
        .update({
          status: 'failed',
          last_error: (error as Error).message,
        })
        .eq('youtube_channel_id', youtubeChannelId);

      return false;
    }
  }

  /**
   * Unsubscribe from WebSub notifications for a YouTube channel
   */
  async unsubscribe(youtubeChannelId: string, callbackUrl: string): Promise<boolean> {
    // Get subscription record to find channel_id
    // @ts-ignore - channel_websub_subscriptions not in generated types yet
    const { data: subscription } = await (supabaseAdmin as any)
      .from('channel_websub_subscriptions')
      .select('channel_id')
      .eq('youtube_channel_id', youtubeChannelId)
      .single();

    if (!subscription) {
      this.logger.warn({ youtubeChannelId }, 'No subscription found to unsubscribe');
      return false;
    }

    return this.subscribe({
      youtubeChannelId,
      channelDbId: subscription.channel_id,
      callbackUrl,
      mode: 'unsubscribe',
    });
  }

  /**
   * Renew expiring subscriptions
   * Should be called periodically (e.g., daily)
   */
  async renewExpiringSubscriptions(callbackUrl: string): Promise<void> {
    this.logger.info('Checking for expiring WebSub subscriptions');

    // Find subscriptions expiring in the next 48 hours
    const expiryThreshold = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // @ts-ignore - channel_websub_subscriptions not in generated types yet
    const { data: expiringSubscriptions, error } = await (supabaseAdmin as any)
      .from('channel_websub_subscriptions')
      .select('*')
      .eq('status', 'verified')
      .not('hub_lease_expires_at', 'is', null)
      .lt('hub_lease_expires_at', expiryThreshold);

    if (error) {
      this.logger.error({ error }, 'Failed to fetch expiring subscriptions');
      return;
    }

    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      this.logger.info('No expiring subscriptions found');
      return;
    }

    this.logger.info({ count: expiringSubscriptions.length }, 'Found expiring subscriptions to renew');

    // Renew each subscription
    for (const sub of expiringSubscriptions as any[]) {
      await this.subscribe({
        youtubeChannelId: sub.youtube_channel_id,
        channelDbId: sub.channel_id,
        callbackUrl,
        mode: 'subscribe',
      });

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Retry failed subscriptions
   * Should be called periodically (e.g., hourly)
   */
  async retryFailedSubscriptions(callbackUrl: string): Promise<void> {
    this.logger.info('Retrying failed WebSub subscriptions');

    // Find failed subscriptions that haven't been retried recently
    const retryThreshold = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago

    // @ts-ignore - channel_websub_subscriptions not in generated types yet
    const { data: failedSubscriptions, error } = await (supabaseAdmin as any)
      .from('channel_websub_subscriptions')
      .select('*')
      .eq('status', 'failed')
      .lt('subscribe_attempts', 5) // Max 5 retry attempts
      .or(`last_subscribe_attempt_at.is.null,last_subscribe_attempt_at.lt.${retryThreshold}`);

    if (error) {
      this.logger.error({ error }, 'Failed to fetch failed subscriptions');
      return;
    }

    if (!failedSubscriptions || failedSubscriptions.length === 0) {
      this.logger.info('No failed subscriptions to retry');
      return;
    }

    this.logger.info({ count: failedSubscriptions.length }, 'Found failed subscriptions to retry');

    // Retry each subscription
    for (const sub of failedSubscriptions as any[]) {
      // Increment retry attempt
      // @ts-ignore - channel_websub_subscriptions not in generated types yet
      await (supabaseAdmin as any)
        .from('channel_websub_subscriptions')
        .update({
          subscribe_attempts: (sub.subscribe_attempts || 0) + 1,
        })
        .eq('id', sub.id);

      await this.subscribe({
        youtubeChannelId: sub.youtube_channel_id,
        channelDbId: sub.channel_id,
        callbackUrl,
        mode: 'subscribe',
      });

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Subscribe to all user channels
   * Called when adding new channels or initializing WebSub
   */
  async subscribeToAllChannels(callbackUrl: string): Promise<void> {
    this.logger.info('Subscribing to all user channels');

    // Get all channels that users are subscribed to
    const { data: channels, error } = await supabaseAdmin
      .from('user_channels')
      .select(`
        channel:channels (
          id,
          youtube_id
        )
      `)
      .not('channel', 'is', null);

    if (error) {
      this.logger.error({ error }, 'Failed to fetch user channels');
      return;
    }

    if (!channels || channels.length === 0) {
      this.logger.info('No channels to subscribe to');
      return;
    }

    // Get unique channels
    const uniqueChannels = Array.from(
      new Map(
        channels
          .map(uc => uc.channel as any)
          .filter(Boolean)
          .map(ch => [ch.youtube_id, ch])
      ).values()
    );

    this.logger.info({ count: uniqueChannels.length }, 'Found unique channels to subscribe');

    // Subscribe to each channel
    for (const channel of uniqueChannels) {
      // Check if already subscribed
      // @ts-ignore - channel_websub_subscriptions not in generated types yet
      const { data: existing } = await (supabaseAdmin as any)
        .from('channel_websub_subscriptions')
        .select('status')
        .eq('youtube_channel_id', channel.youtube_id)
        .single();

      // Skip if already verified
      if (existing?.status === 'verified') {
        this.logger.debug({ youtubeChannelId: channel.youtube_id }, 'Already subscribed, skipping');
        continue;
      }

      await this.subscribe({
        youtubeChannelId: channel.youtube_id,
        channelDbId: channel.id,
        callbackUrl,
        mode: 'subscribe',
      });

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}