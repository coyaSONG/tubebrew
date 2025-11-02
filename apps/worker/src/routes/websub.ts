import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { parseStringPromise } from 'xml2js';
import crypto from 'crypto';
import { supabaseAdmin } from '@tubebrew/db';

// Type for channel_websub_subscriptions table (not in generated types yet)
interface WebSubSubscription {
  id: string;
  channel_id: string;
  youtube_channel_id: string;
  hub_topic_url: string;
  hub_callback_url: string;
  hub_lease_seconds: number | null;
  hub_lease_expires_at: string | null;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  last_notification_at: string | null;
  verification_token: string | null;
  subscribe_attempts: number;
  last_subscribe_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * WebSub (PubSubHubbub) Routes
 * Handles YouTube channel subscription notifications
 */

interface WebSubVerificationQuery {
  'hub.mode': string;
  'hub.topic': string;
  'hub.challenge': string;
  'hub.lease_seconds'?: string;
}

interface AtomFeed {
  feed?: {
    entry?: Array<{
      'yt:videoId'?: string[];
      'yt:channelId'?: string[];
      title?: string[];
      published?: string[];
      updated?: string[];
    }>;
  };
}

export async function websubRoutes(fastify: FastifyInstance) {
  /**
   * GET /websub/callback
   * Handles WebSub subscription verification from YouTube
   */
  fastify.get('/websub/callback', async (
    request: FastifyRequest<{ Querystring: WebSubVerificationQuery }>,
    reply: FastifyReply
  ) => {
    const { 'hub.mode': mode, 'hub.topic': topic, 'hub.challenge': challenge, 'hub.lease_seconds': leaseSeconds } = request.query;

    fastify.log.info({ mode, topic }, 'WebSub verification request received');

    // Verify this is a subscription request for a YouTube channel we care about
    if (mode !== 'subscribe' && mode !== 'unsubscribe') {
      fastify.log.warn({ mode }, 'Invalid hub.mode');
      return reply.code(400).send('Invalid hub.mode');
    }

    // Extract YouTube channel ID from topic URL
    // Format: https://www.youtube.com/xml/feeds/videos.xml?channel_id=CHANNEL_ID
    const channelIdMatch = topic.match(/channel_id=([^&]+)/);
    if (!channelIdMatch) {
      fastify.log.warn({ topic }, 'Invalid topic URL');
      return reply.code(400).send('Invalid topic URL');
    }

    const youtubeChannelId = channelIdMatch[1];

    if (mode === 'subscribe') {
      // Update subscription status to verified
      // @ts-ignore - channel_websub_subscriptions not in generated types yet
      const { error } = await (supabaseAdmin as any)
        .from('channel_websub_subscriptions')
        .update({
          status: 'verified',
          hub_lease_seconds: leaseSeconds ? parseInt(leaseSeconds) : null,
          hub_lease_expires_at: leaseSeconds
            ? new Date(Date.now() + parseInt(leaseSeconds) * 1000).toISOString()
            : null,
        })
        .eq('youtube_channel_id', youtubeChannelId);

      if (error) {
        fastify.log.error({ error, youtubeChannelId }, 'Failed to update subscription status');
      } else {
        fastify.log.info({ youtubeChannelId, leaseSeconds }, 'Subscription verified');
      }
    } else {
      // Unsubscribe
      // @ts-ignore - channel_websub_subscriptions not in generated types yet
      const { error } = await (supabaseAdmin as any)
        .from('channel_websub_subscriptions')
        .update({ status: 'expired' })
        .eq('youtube_channel_id', youtubeChannelId);

      if (error) {
        fastify.log.error({ error, youtubeChannelId }, 'Failed to mark subscription as expired');
      } else {
        fastify.log.info({ youtubeChannelId }, 'Subscription marked as expired');
      }
    }

    // Always return the challenge to confirm verification
    return reply.code(200).send(challenge);
  });

  /**
   * POST /websub/callback
   * Handles video upload/update notifications from YouTube
   */
  fastify.post('/websub/callback', async (
    request: FastifyRequest<{ Body: string }>,
    reply: FastifyReply
  ) => {
    try {
      const atomXml = request.body as unknown as string;

      fastify.log.debug({ atomXml }, 'Received WebSub notification');

      // Parse Atom feed
      const parsed: AtomFeed = await parseStringPromise(atomXml);

      if (!parsed.feed?.entry || parsed.feed.entry.length === 0) {
        fastify.log.warn('No entries in Atom feed');
        return reply.code(200).send('OK');
      }

      // Process each video entry
      for (const entry of parsed.feed.entry) {
        const videoId = entry['yt:videoId']?.[0];
        const channelId = entry['yt:channelId']?.[0];
        const title = entry.title?.[0];
        const published = entry.published?.[0];
        const updated = entry.updated?.[0];

        if (!videoId || !channelId) {
          fastify.log.warn({ entry }, 'Missing videoId or channelId in entry');
          continue;
        }

        fastify.log.info({ videoId, channelId, title }, 'Processing WebSub notification');

        // Update last notification timestamp
        // @ts-ignore - channel_websub_subscriptions not in generated types yet
        await (supabaseAdmin as any)
          .from('channel_websub_subscriptions')
          .update({ last_notification_at: new Date().toISOString() })
          .eq('youtube_channel_id', channelId);

        // Add video collection job to queue
        // This will be handled by the existing video-collection worker
        await fastify.videoCollectionQueue.add(
          `websub-${channelId}-${videoId}`,
          {
            userId: null, // Will be determined by the worker based on who subscribes to this channel
            channelId,
            videoId, // Specific video to process
            source: 'websub',
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          }
        );

        fastify.log.info({ videoId, channelId }, 'WebSub video job queued');
      }

      return reply.code(200).send('OK');
    } catch (error) {
      fastify.log.error({ error: (error as Error).message }, 'Error processing WebSub notification');
      // Return 200 to prevent YouTube from retrying
      return reply.code(200).send('OK');
    }
  });

  /**
   * GET /websub/status
   * Returns WebSub subscription status for monitoring
   */
  fastify.get('/websub/status', async (request, reply) => {
    try {
      // @ts-ignore - channel_websub_subscriptions not in generated types yet
      const { data: subscriptions, error } = await (supabaseAdmin as any)
        .from('channel_websub_subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        fastify.log.error({ error }, 'Failed to fetch WebSub subscriptions');
        return reply.code(500).send({ error: 'Failed to fetch subscriptions' });
      }

      // @ts-ignore - subscriptions is typed as any[] due to new table
      const stats = {
        total: subscriptions?.length || 0,
        verified: subscriptions?.filter((s: any) => s.status === 'verified').length || 0,
        pending: subscriptions?.filter((s: any) => s.status === 'pending').length || 0,
        failed: subscriptions?.filter((s: any) => s.status === 'failed').length || 0,
        expired: subscriptions?.filter((s: any) => s.status === 'expired').length || 0,
        expiring_soon: subscriptions?.filter((s: any) => {
          if (!s.hub_lease_expires_at) return false;
          const expiresIn = new Date(s.hub_lease_expires_at).getTime() - Date.now();
          return expiresIn > 0 && expiresIn < 24 * 60 * 60 * 1000; // Less than 24 hours
        }).length || 0,
      };

      return reply.code(200).send({
        stats,
        subscriptions: subscriptions?.slice(0, 20), // Return first 20 for quick view
      });
    } catch (error) {
      fastify.log.error({ error: (error as Error).message }, 'Error fetching WebSub status');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}