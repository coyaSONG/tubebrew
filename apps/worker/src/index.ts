import Fastify from 'fastify';
import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { supabaseAdmin, DBUtils } from '@tubebrew/db';
import { processVideoCollection } from './jobs/video-collection';
import { processSummaryGeneration } from './jobs/summary-generation';
import { websubRoutes } from './routes/websub';
import { WebSubManager } from './services/websub-manager';

const redisConnection = new Redis(
  process.env.NODE_ENV === 'production'
    ? process.env.REDIS_URL!
    : process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  }
);

// Initialize Fastify server
const isDevelopment = process.env.NODE_ENV !== 'production';
const fastify = Fastify({
  logger: isDevelopment
    ? {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        level: 'info',
      },
});

// Use Fastify's logger
const logger = fastify.log;
const dbUtils = new DBUtils(supabaseAdmin);

// Initialize WebSub manager
// @ts-ignore - Fastify logger is compatible with pino Logger interface
const websubManager = new WebSubManager(logger);

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Queue stats endpoint
fastify.get('/stats', async () => {
  const [videoCollectionCounts, summaryGenCounts] = await Promise.all([
    videoCollectionQueue.getJobCounts(),
    summaryGenerationQueue.getJobCounts(),
  ]);

  return {
    videoCollection: videoCollectionCounts,
    summaryGeneration: summaryGenCounts,
  };
});

// Manual trigger endpoint for testing
fastify.post('/trigger-collection', async () => {
  logger.info('Manual video collection triggered');
  await scheduleVideoCollection();
  return { success: true, message: 'Video collection triggered' };
});

// Queue definitions
const videoCollectionQueue = new Queue('video-collection', { connection: redisConnection });
const summaryGenerationQueue = new Queue('summary-generation', { connection: redisConnection });

// Make queues available to routes via fastify instance
declare module 'fastify' {
  interface FastifyInstance {
    videoCollectionQueue: Queue;
    summaryGenerationQueue: Queue;
  }
}

fastify.decorate('videoCollectionQueue', videoCollectionQueue);
fastify.decorate('summaryGenerationQueue', summaryGenerationQueue);

// Workers with optimized settings for WebSub
const videoCollectionWorker = new Worker(
  'video-collection',
  processVideoCollection,
  {
    connection: redisConnection,
    concurrency: 2, // Reduced from 3
    // Note: drainDelay is removed as it's not in the current BullMQ version
    // We'll optimize polling through reduced scheduling frequency instead
  }
);

const summaryGenerationWorker = new Worker(
  'summary-generation',
  processSummaryGeneration,
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

// Event handlers
videoCollectionWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, result: job.returnvalue }, 'Video collection completed');
});

videoCollectionWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Video collection failed');
});

summaryGenerationWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, result: job.returnvalue }, 'Summary generation completed');
});

summaryGenerationWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Summary generation failed');
});

// Scheduler function to queue video collection jobs
async function scheduleVideoCollection() {
  try {
    logger.info('Starting scheduled video collection');

    // Get all users from public schema (not auth schema)
    const { data: users, error } = await supabaseAdmin
      .schema('public')
      .from('users')
      .select('id, provider_token');

    if (error) {
      logger.error({ error: error.message }, 'Failed to fetch users');
      return;
    }

    if (!users || users.length === 0) {
      logger.info('No users found for video collection');
      return;
    }

    // For each user, get their subscribed channels and queue collection jobs
    for (const user of users) {
      if (!user.provider_token) {
        continue;
      }

      const channels = await dbUtils.getUserChannels(user.id);

      for (const userChannel of channels) {
        const channel = userChannel.channel as any;
        if (!channel) continue;

        // Add video collection job for this channel
        await videoCollectionQueue.add(
          `collect-${user.id}-${channel.youtube_id}`,
          {
            userId: user.id,
            channelId: channel.youtube_id,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          }
        );
      }

      logger.info({ userId: user.id, channelCount: channels.length }, 'Queued video collection jobs');
    }
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Error in scheduled video collection');
  }
}

// Start server
const start = async () => {
  try {
    // Register WebSub routes
    await fastify.register(websubRoutes);

    const port = parseInt(process.env.PORT || '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    logger.info(`Worker server listening on port ${port}`);

    // Get callback URL from environment
    const callbackUrl = process.env.WEBSUB_CALLBACK_URL || `http://localhost:${port}/websub/callback`;
    logger.info({ callbackUrl }, 'WebSub callback URL configured');

    // Subscribe to all channels on startup (after 2 minute delay)
    setTimeout(async () => {
      logger.info('Subscribing to all user channels via WebSub');
      await websubManager.subscribeToAllChannels(callbackUrl);
    }, 120000);

    // Run initial RSS collection as fallback (5 minute delay)
    setTimeout(async () => {
      logger.info('Running initial fallback RSS collection');
      await scheduleVideoCollection();
    }, 300000);

    // Schedule fallback RSS polling once per day (for WebSub failure protection)
    setInterval(async () => {
      logger.info('Running daily fallback RSS collection');
      await scheduleVideoCollection();
    }, 24 * 60 * 60 * 1000);

    // Renew expiring WebSub subscriptions daily
    setInterval(async () => {
      logger.info('Renewing expiring WebSub subscriptions');
      await websubManager.renewExpiringSubscriptions(callbackUrl);
    }, 24 * 60 * 60 * 1000);

    // Retry failed WebSub subscriptions every 6 hours
    setInterval(async () => {
      logger.info('Retrying failed WebSub subscriptions');
      await websubManager.retryFailedSubscriptions(callbackUrl);
    }, 6 * 60 * 60 * 1000);

    logger.info('WebSub scheduler started (daily RSS fallback, subscription renewal)');
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();