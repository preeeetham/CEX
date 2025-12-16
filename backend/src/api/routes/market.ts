import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Register market data routes
 */
export async function registerMarketRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/orderbook - Get order book snapshot
   */
  server.get(
    '/api/v1/orderbook',
    async (
      request: FastifyRequest<{
        Querystring: { market: string; depth?: number };
      }>,
      reply: FastifyReply
    ) => {
      const { market, depth = 10 } = request.query;
      const marketManager = server.marketManager;

      if (!market) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_MARKET',
            message: 'Market parameter is required',
            timestamp: Date.now(),
          },
        });
      }

      const marketConfig = marketManager.getMarket(market);
      if (!marketConfig) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_MARKET',
            message: `Market ${market} does not exist`,
            timestamp: Date.now(),
          },
        });
      }

      const engine = marketManager.getEngine(market);
      if (!engine) {
        return reply.status(503).send({
          error: {
            code: 'MARKET_UNAVAILABLE',
            message: `Market ${market} is temporarily unavailable`,
            timestamp: Date.now(),
          },
        });
      }

      const depthNum = Math.min(Math.max(parseInt(String(depth), 10) || 10, 1), 100);
      const snapshot = engine.getOrderBook().getSnapshot(depthNum);

      return reply.status(200).send(snapshot);
    }
  );

  /**
   * GET /api/v1/trades - Get trade history
   */
  server.get(
    '/api/v1/trades',
    async (
      request: FastifyRequest<{
        Querystring: { market: string; limit?: number; since?: number };
      }>,
      reply: FastifyReply
    ) => {
      const { market, limit = 50, since } = request.query;
      const marketManager = server.marketManager;

      if (!market) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_MARKET',
            message: 'Market parameter is required',
            timestamp: Date.now(),
          },
        });
      }

      const marketConfig = marketManager.getMarket(market);
      if (!marketConfig) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_MARKET',
            message: `Market ${market} does not exist`,
            timestamp: Date.now(),
          },
        });
      }

      const engine = marketManager.getEngine(market);
      if (!engine) {
        return reply.status(503).send({
          error: {
            code: 'MARKET_UNAVAILABLE',
            message: `Market ${market} is temporarily unavailable`,
            timestamp: Date.now(),
          },
        });
      }

      let trades = engine.getRecentTrades(Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 500));

      // Filter by since timestamp if provided
      if (since) {
        const sinceNum = parseInt(String(since), 10);
        trades = trades.filter((trade) => trade.timestamp >= sinceNum);
      }

      return reply.status(200).send({
        market,
        trades: trades.map((trade) => trade.toJSON()),
      });
    }
  );

  /**
   * GET /api/v1/market/stats - Get 24-hour market statistics
   */
  server.get(
    '/api/v1/market/stats',
    async (
      request: FastifyRequest<{
        Querystring: { market: string };
      }>,
      reply: FastifyReply
    ) => {
      const { market } = request.query;
      const marketManager = server.marketManager;

      if (!market) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_MARKET',
            message: 'Market parameter is required',
            timestamp: Date.now(),
          },
        });
      }

      const marketConfig = marketManager.getMarket(market);
      if (!marketConfig) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_MARKET',
            message: `Market ${market} does not exist`,
            timestamp: Date.now(),
          },
        });
      }

      const engine = marketManager.getEngine(market);
      if (!engine) {
        return reply.status(503).send({
          error: {
            code: 'MARKET_UNAVAILABLE',
            message: `Market ${market} is temporarily unavailable`,
            timestamp: Date.now(),
          },
        });
      }

      // Calculate 24h stats from all trades
      const allTrades = engine.getAllTrades();
      const now = Date.now();
      const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
      const recentTrades = allTrades.filter((trade) => trade.timestamp >= twentyFourHoursAgo);

      if (recentTrades.length === 0) {
        const orderBook = engine.getOrderBook();
        const lastPrice = orderBook.getBestBidPrice() || orderBook.getBestAskPrice() || 0;

        return reply.status(200).send({
          market,
          lastPrice: lastPrice || undefined,
          change24h: 0,
          changePercent24h: 0,
          high24h: lastPrice || undefined,
          low24h: lastPrice || undefined,
          volume24h: 0,
          quoteVolume24h: 0,
          timestamp: now,
        });
      }

      const prices = recentTrades.map((t) => t.price);
      const volumes = recentTrades.map((t) => t.quantity);
      const quoteVolumes = recentTrades.map((t) => t.price * t.quantity);

      const lastPrice = recentTrades[0]?.price || 0;
      const firstPrice = recentTrades[recentTrades.length - 1]?.price || lastPrice;
      const high24h = Math.max(...prices);
      const low24h = Math.min(...prices);
      const volume24h = volumes.reduce((sum, v) => sum + v, 0);
      const quoteVolume24h = quoteVolumes.reduce((sum, v) => sum + v, 0);
      const change24h = lastPrice - firstPrice;
      const changePercent24h = firstPrice > 0 ? (change24h / firstPrice) * 100 : 0;

      return reply.status(200).send({
        market,
        lastPrice,
        change24h: parseFloat(change24h.toFixed(2)),
        changePercent24h: parseFloat(changePercent24h.toFixed(2)),
        high24h,
        low24h,
        volume24h,
        quoteVolume24h: parseFloat(quoteVolume24h.toFixed(2)),
        timestamp: now,
      });
    }
  );
}

