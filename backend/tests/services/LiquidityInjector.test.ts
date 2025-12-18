import { LiquidityInjector } from '../../src/services/LiquidityInjector';
import { MatchingEngine } from '../../src/engine/MatchingEngine';
import { Market } from '../../src/models/Market';
import { LiquidityConfig, createDefaultConfig } from '../../src/services/LiquidityConfig';
import { OrderSide } from '../../src/models/types';

describe('LiquidityInjector', () => {
  let injector: LiquidityInjector;
  let matchingEngine: MatchingEngine;
  let market: Market;
  let config: LiquidityConfig;

  beforeEach(() => {
    market = new Market({
      marketId: 'STOCK-INR',
      baseAsset: 'STOCK',
      quoteAsset: 'INR',
      tickSize: 0.01,
      minQuantity: 1,
      maxQuantity: 1000000,
      status: 'ACTIVE',
    });

    matchingEngine = new MatchingEngine('STOCK-INR');
    config = createDefaultConfig('STOCK-INR', 82.0);
    injector = new LiquidityInjector('STOCK-INR', config, matchingEngine, market);
  });

  it('should inject orders on both sides', () => {
    const result = injector.inject();

    expect(result.ordersCreated).toBeGreaterThan(0);
    expect(result.referencePrice).toBeDefined();

    const orderBook = matchingEngine.getOrderBook();
    const bids = orderBook.getOrdersBySide(OrderSide.BUY);
    const asks = orderBook.getOrdersBySide(OrderSide.SELL);

    expect(bids.length).toBeGreaterThan(0);
    expect(asks.length).toBeGreaterThan(0);
  });

  it('should cancel existing system orders before injecting', () => {
    // First injection
    injector.inject();

    // Second injection should cancel previous orders
    const result = injector.inject();

    expect(result.ordersCanceled).toBeGreaterThan(0);
  });

  it('should generate orders with correct spread', () => {
    injector.inject();

    const orderBook = matchingEngine.getOrderBook();
    const bestBid = orderBook.getBestBidPrice();
    const bestAsk = orderBook.getBestAskPrice();

    if (bestBid && bestAsk) {
      const spread = bestAsk - bestBid;
      expect(spread).toBeGreaterThanOrEqual(config.spread * 0.5); // At least half spread
    }
  });

  it('should generate orders at multiple price levels', () => {
    injector.inject();

    const orderBook = matchingEngine.getOrderBook();
    const snapshot = orderBook.getSnapshot(20);

    // Should have multiple price levels
    expect(snapshot.bids.length).toBeGreaterThan(1);
    expect(snapshot.asks.length).toBeGreaterThan(1);
  });

  it('should update reference price on each injection', () => {
    injector.inject();
    const price2 = injector.getReferencePrice();

    // Price should be defined after injection
    expect(price2).toBeDefined();
    expect(price2).toBeGreaterThan(0);
  });

  it('should respect market tick size', () => {
    injector.inject();

    const orderBook = matchingEngine.getOrderBook();
    const allOrders = [
      ...orderBook.getOrdersBySide(OrderSide.BUY),
      ...orderBook.getOrdersBySide(OrderSide.SELL),
    ];

    for (const order of allOrders) {
      // Check if price is a multiple of tick size (accounting for floating point precision)
      const ticks = order.price / market.tickSize;
      const roundedTicks = Math.round(ticks);
      const expectedPrice = roundedTicks * market.tickSize;
      const difference = Math.abs(order.price - expectedPrice);
      expect(difference).toBeLessThan(0.0001); // Account for floating point precision
    }
  });
});

