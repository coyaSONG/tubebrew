import 'dotenv/config';
import Fastify from 'fastify';
import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Initialize Fastify server
const fastify = Fastify({
  logger,
});

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Queue definitions
const videoQueue = new Queue('video-processing', { connection: redisConnection });

// Worker definitions (will be implemented in jobs/)
const videoWorker = new Worker(
  'video-processing',
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, 'Processing video job');
    // Job processing logic will be implemented here
    return { success: true };
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

videoWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed');
});

videoWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Job failed');
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    logger.info(`Worker server listening on port ${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();
