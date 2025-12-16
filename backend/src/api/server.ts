import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { MarketManager } from '../services/MarketManager';
import { EventPublisher } from '../services/EventPublisher';

/**
 * Create and configure Fastify server
 */
export function createServer(marketManager: MarketManager, eventPublisher: EventPublisher): FastifyInstance {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Register CORS
  server.register(cors, {
    origin: true, // Allow all origins in development
  });

  // Serve static files from public directory
  server.register(fastifyStatic, {
    root: path.join(__dirname, '../../public'),
    prefix: '/', // optional: default '/'
  });

  // Health check endpoint
  server.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // Make marketManager and eventPublisher available to routes
  server.decorate('marketManager', marketManager);
  server.decorate('eventPublisher', eventPublisher);

  return server;
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    marketManager: MarketManager;
    eventPublisher: EventPublisher;
  }
}

