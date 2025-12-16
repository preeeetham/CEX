import { createServer } from '../../src/api/server';
import { registerMarketRoutes } from '../../src/api/routes/market';
import { MarketManager } from '../../src/services/MarketManager';
import { EventPublisher } from '../../src/services/EventPublisher';
import { Market } from '../../src/models/Market';

describe('Market API', () => {
  let server: any;
  let marketManager: MarketManager;
  let eventPublisher: EventPublisher;

  beforeAll(async () => {
    marketManager = new MarketManager();
    eventPublisher = new EventPublisher();
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

    server = createServer(marketManager, eventPublisher);
    await registerMarketRoutes(server);
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('GET /api/v1/orderbook', () => {
    it('should get order book snapshot', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/orderbook?market=STOCK-INR',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.market).toBe('STOCK-INR');
      expect(body.bids).toBeDefined();
      expect(body.asks).toBeDefined();
      expect(Array.isArray(body.bids)).toBe(true);
      expect(Array.isArray(body.asks)).toBe(true);
    });

    it('should return 400 for missing market parameter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/orderbook',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid market', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/orderbook?market=INVALID',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/trades', () => {
    it('should get trade history', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/trades?market=STOCK-INR',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.market).toBe('STOCK-INR');
      expect(body.trades).toBeDefined();
      expect(Array.isArray(body.trades)).toBe(true);
    });
  });

  describe('GET /api/v1/market/stats', () => {
    it('should get market statistics', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/market/stats?market=STOCK-INR',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.market).toBe('STOCK-INR');
      expect(body.timestamp).toBeDefined();
    });
  });
});

