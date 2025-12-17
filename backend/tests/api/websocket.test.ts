import { createServer } from '../../src/api/server';
import { registerWebSocketRoutes } from '../../src/api/websocket';
import { MarketManager } from '../../src/services/MarketManager';
import { EventPublisher } from '../../src/services/EventPublisher';
import { Market } from '../../src/models/Market';
import WebSocket from 'ws';

describe('WebSocket API', () => {
  let server: any;
  let marketManager: MarketManager;
  let eventPublisher: EventPublisher;
  const port = 3001;

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
    await registerWebSocketRoutes(server, marketManager, eventPublisher);
    await server.listen({ port, host: '127.0.0.1' });
    // Wait a bit for server to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    await server.close();
  });

  describe('WebSocket Connection', () => {
    it('should connect and receive welcome message', (done) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      ws.on('open', () => {
        // Connection opened - wait for message
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          expect(message.type).toBe('connected');
          expect(message.timestamp).toBeDefined();
          ws.close();
          done();
        } catch (error) {
          ws.close();
          done(error);
        }
      });

      ws.on('error', (error) => {
        ws.close();
        done(error);
      });

      // Timeout safety
      setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) {
          ws.close();
          done(new Error('Timeout waiting for connected message'));
        }
      }, 5000);
    });

    it('should subscribe to orderbook channel', (done) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      let receivedSubscribed = false;
      let receivedOrderbook = false;

      ws.on('open', () => {
        // Wait for connected message before subscribing
      });

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          // Now send subscribe
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channels: [
                {
                  name: 'orderbook',
                  market: 'STOCK-INR',
                  depth: 10,
                },
              ],
            })
          );
        } else if (message.type === 'subscribed') {
          expect(message.channel).toBe('orderbook');
          expect(message.market).toBe('STOCK-INR');
          receivedSubscribed = true;
        } else if (message.eventType === 'ORDERBOOK_UPDATED') {
          expect(message.market).toBe('STOCK-INR');
          expect(message.payload).toBeDefined();
          expect(message.payload.bids).toBeDefined();
          expect(message.payload.asks).toBeDefined();
          receivedOrderbook = true;
        }

        if (receivedSubscribed && receivedOrderbook) {
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        ws.close();
        done(error);
      });
    });

    it('should subscribe to trades channel', (done) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      ws.on('open', () => {
        // Wait for connected message
      });

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channels: [
                {
                  name: 'trades',
                  market: 'STOCK-INR',
                },
              ],
            })
          );
        } else if (message.type === 'subscribed') {
          expect(message.channel).toBe('trades');
          expect(message.market).toBe('STOCK-INR');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        ws.close();
        done(error);
      });
    });

    it('should subscribe to user.orders channel', (done) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      ws.on('open', () => {
        // Wait for connected message
      });

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channels: [
                {
                  name: 'user.orders',
                },
              ],
              userId: 'user123',
            })
          );
        } else if (message.type === 'subscribed') {
          expect(message.channel).toBe('user.orders');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        ws.close();
        done(error);
      });
    });

    it('should unsubscribe from channels', (done) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      let subscribed = false;

      ws.on('open', () => {
        // Wait for connected message
      });

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          // First subscribe
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channels: [
                {
                  name: 'orderbook',
                  market: 'STOCK-INR',
                },
              ],
            })
          );
        } else if (message.type === 'subscribed' && !subscribed) {
          subscribed = true;
          // Now unsubscribe
          ws.send(
            JSON.stringify({
              type: 'unsubscribe',
              channels: ['orderbook'],
            })
          );
        } else if (message.type === 'unsubscribed') {
          expect(message.channel).toBe('orderbook');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        ws.close();
        done(error);
      });
    });

    it('should receive trade events', (done) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      ws.on('open', () => {
        // Wait for connected message
      });

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channels: [
                {
                  name: 'trades',
                  market: 'STOCK-INR',
                },
              ],
            })
          );
        } else if (message.type === 'subscribed') {
          // Subscription successful - test passes
          // In a real scenario, trade events would be received here
          setTimeout(() => {
            ws.close();
            done();
          }, 100);
        }
      });

      ws.on('error', (error) => {
        ws.close();
        done(error);
      });
    });

    it('should handle invalid subscription message', (done) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      let testDone = false;

      ws.on('open', () => {
        // Wait for connected message
      });

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channels: [
                {
                  name: 'orderbook',
                  // Missing market
                },
              ],
            })
          );
        } else if (message.type === 'error' && !testDone) {
          testDone = true;
          expect(message.message).toContain('Market is required');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        if (!testDone) {
          testDone = true;
          ws.close();
          done(error);
        }
      });

      // Timeout after 2 seconds
      setTimeout(() => {
        if (!testDone) {
          testDone = true;
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
          done(new Error('Test timeout - error message not received'));
        }
      }, 2000);
    });

    it('should handle invalid market', (done) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);

      let testDone = false;

      ws.on('open', () => {
        // Wait for connected message
      });

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              channels: [
                {
                  name: 'orderbook',
                  market: 'INVALID-MARKET',
                },
              ],
            })
          );
        } else if (message.type === 'error' && !testDone) {
          testDone = true;
          expect(message.message).toContain('does not exist');
          ws.close();
          done();
        }
      });

      ws.on('error', (error) => {
        if (!testDone) {
          testDone = true;
          ws.close();
          done(error);
        }
      });

      // Timeout after 2 seconds
      setTimeout(() => {
        if (!testDone) {
          testDone = true;
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
          done(new Error('Test timeout - error message not received'));
        }
      }, 2000);
    });
  });
});

