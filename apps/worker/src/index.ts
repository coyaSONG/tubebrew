import Fastify from 'fastify';
import { Worker, Queue, QueueScheduler } from 'bullmq';
import Redis from 'ioredis';
import { supabaseAdmin, DBUtils } from '@tubebrew/db';
import { processVideoCollection } from './jobs/video-collection';
import { processSummaryGeneration } from './jobs/summary-generation';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

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
    : true,
});

// Use Fastify's logger
const logger = fastify.log;
const dbUtils = new DBUtils(supabaseAdmin);

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

// Queue definitions
const videoCollectionQueue = new Queue('video-collection', { connection: redisConnection });
const summaryGenerationQueue = new Queue('summary-generation', { connection: redisConnection });

// Workers
const videoCollectionWorker = new Worker(
  'video-collection',
  processVideoCollection,
  {
    connection: redisConnection,
    concurrency: 3,
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

    // Get all users
    const { data: users, error } = await supabaseAdmin
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
    const port = parseInt(process.env.PORT || '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    logger.info(`Worker server listening on port ${port}`);

    // Run initial collection after startup (1 minute delay)
    setTimeout(async () => {
      logger.info('Running initial video collection');
      await scheduleVideoCollection();
    }, 60000);

    // Schedule video collection every 15 minutes
    setInterval(async () => {
      await scheduleVideoCollection();
    }, 15 * 60 * 1000);

    logger.info('Video collection scheduler started (15 minute interval)');
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();