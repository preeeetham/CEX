import { createServer } from '../../src/api/server';
import { registerOrderRoutes } from '../../src/api/routes/orders';
import { MarketManager } from '../../src/services/MarketManager';
import { EventPublisher } from '../../src/services/EventPublisher';
import { Market } from '../../src/models/Market';
import { OrderSide, OrderType } from '../../src/models/types';

describe('Order API', () => {
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
    await registerOrderRoutes(server);
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('POST /api/v1/order', () => {
    it('should place a limit buy order', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/order',
        headers: {
          'x-user-id': 'user1',
        },
        payload: {
          market: 'STOCK-INR',
          side: 'BUY',
          type: 'LIMIT',
          price: 80.01, // Low price that won't match
          quantity: 100,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.market).toBe('STOCK-INR');
      expect(body.side).toBe(OrderSide.BUY);
      expect(body.type).toBe(OrderType.LIMIT);
      expect(body.price).toBe(80.01);
      expect(body.quantity).toBe(100);
      expect(body.orderId).toBeDefined();
    });

    it('should reject order with invalid market', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/order',
        payload: {
          market: 'INVALID-MARKET',
          side: 'BUY',
          type: 'LIMIT',
          price: 82.0,
          quantity: 100,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_MARKET');
    });

    it('should reject limit order without price', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/order',
        payload: {
          market: 'STOCK-INR',
          side: 'BUY',
          type: 'LIMIT',
          quantity: 100,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PRICE');
    });

    it('should match orders and return fills', async () => {
      // Place sell order first
      await server.inject({
        method: 'POST',
        url: '/api/v1/order',
        headers: {
          'x-user-id': 'seller1',
        },
        payload: {
          market: 'STOCK-INR',
          side: 'SELL',
          type: 'LIMIT',
          price: 82.01,
          quantity: 50,
        },
      });

      // Place buy order that should match
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/order',
        headers: {
          'x-user-id': 'buyer1',
        },
        payload: {
          market: 'STOCK-INR',
          side: 'BUY',
          type: 'LIMIT',
          price: 82.01,
          quantity: 50,
        },
      });

      expect(response.statusCode).toBe(201);
      const matchBody = JSON.parse(response.body);
      expect(matchBody.fills).toBeDefined();
      expect(matchBody.fills.length).toBeGreaterThan(0);
      expect(matchBody.status).toBe('FILLED');
    });
  });

  describe('GET /api/v1/order/:orderId', () => {
    it('should get order status', async () => {
      // First place an order
      const placeResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/order',
        headers: {
          'x-user-id': 'user1',
        },
        payload: {
          market: 'STOCK-INR',
          side: 'BUY',
          type: 'LIMIT',
          price: 79.01, // Low price that won't match
          quantity: 100,
        },
      });

      const order = JSON.parse(placeResponse.body);
      const orderId = order.orderId;

      // Get order status
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/order/${orderId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.orderId).toBe(orderId);
      expect(body.market).toBe('STOCK-INR');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/v1/order/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/order/:orderId', () => {
    it('should cancel an order', async () => {
      // First place an order
      const placeResponse = await server.inject({
        method: 'POST',
        url: '/api/v1/order',
        headers: {
          'x-user-id': 'user1',
        },
        payload: {
          market: 'STOCK-INR',
          side: 'BUY',
          type: 'LIMIT',
          price: 78.01, // Low price that won't match
          quantity: 100,
        },
      });

      const order = JSON.parse(placeResponse.body);
      const orderId = order.orderId;

      // Cancel the order
      const response = await server.inject({
        method: 'DELETE',
        url: `/api/v1/order/${orderId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.orderId).toBe(orderId);
      expect(body.status).toBe('CANCELED');
    });
  });
});

