import { createServer } from './api/server';
import { registerOrderRoutes } from './api/routes/orders';
import { registerMarketRoutes } from './api/routes/market';
import { registerWebSocketRoutes } from './api/websocket';
import { registerInternalRoutes } from './api/routes/internal';
import { MarketManager } from './services/MarketManager';
import { EventPublisher } from './services/EventPublisher';
import { LiquidityScheduler } from './services/LiquidityScheduler';
import { Market } from './models/Market';

/**
 * Main application entry point
 */
async function start() {
  // Initialize market manager, event publisher, and liquidity scheduler
  const marketManager = new MarketManager();
  const eventPublisher = new EventPublisher();
  const liquidityScheduler = new LiquidityScheduler(marketManager, eventPublisher);

  // Register default markets
  marketManager.registerMarket(
    new Market({
      marketId: 'STOCK-INR',
      baseAsset: 'STOCK',
      quoteAsset: 'INR',
      tickSize: 0.01,
      minQuantity: 1,
      maxQuantity: 1000000,
      status: 'ACTIVE',
    })
  );

  marketManager.registerMarket(
    new Market({
      marketId: 'TECH-INR',
      baseAsset: 'TECH',
      quoteAsset: 'INR',
      tickSize: 0.01,
      minQuantity: 1,
      maxQuantity: 1000000,
      status: 'ACTIVE',
    })
  );

  marketManager.registerMarket(
    new Market({
      marketId: 'BOND-INR',
      baseAsset: 'BOND',
      quoteAsset: 'INR',
      tickSize: 0.01,
      minQuantity: 1,
      maxQuantity: 1000000,
      status: 'ACTIVE',
    })
  );

  // Create server
  const server = createServer(marketManager, eventPublisher);

  // Register routes
  await registerOrderRoutes(server);
  await registerMarketRoutes(server);
  await registerWebSocketRoutes(server, marketManager, eventPublisher);
  await registerInternalRoutes(server, liquidityScheduler);

  // Start server
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await server.listen({ port, host });
    server.log.info(`🚀 Server listening on http://${host}:${port}`);
    server.log.info(`📊 Markets registered: ${marketManager.getAllMarkets().map((m) => m.marketId).join(', ')}`);

    // Start liquidity injection for all markets (if enabled)
    if (process.env.LIQUIDITY_ENABLED !== 'false') {
      liquidityScheduler.startAll();
      server.log.info(`💧 Liquidity injection started for all markets`);
    }
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Start the application
start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

