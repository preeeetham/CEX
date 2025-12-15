import { MatchingEngine } from '../../src/engine/MatchingEngine';
import { Order } from '../../src/models/Order';
import { OrderSide, OrderType, OrderOwner } from '../../src/models/types';

describe('MatchingEngine', () => {
  let engine: MatchingEngine;

  beforeEach(() => {
    engine = new MatchingEngine('STOCK-INR');
  });

  it('should match two limit orders at same price', () => {
    const buyOrder = new Order({
      market: 'STOCK-INR',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: 82.0,
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'buyer1',
    });

    const sellOrder = new Order({
      market: 'STOCK-INR',
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      price: 82.0,
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'seller1',
    });

    // Add sell order to book first
    engine.processOrder(sellOrder);

    // Process buy order (should match)
    const result = engine.processOrder(buyOrder);

    expect(result.trades.length).toBe(1);
    expect(result.trades[0].price).toBe(82.0);
    expect(result.trades[0].quantity).toBe(100);
    expect(buyOrder.status).toBe('FILLED');
    expect(sellOrder.status).toBe('FILLED');
  });

  it('should match buy order at better price (maker price wins)', () => {
    const buyOrder = new Order({
      market: 'STOCK-INR',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: 82.5, // Willing to pay more
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'buyer1',
    });

    const sellOrder = new Order({
      market: 'STOCK-INR',
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      price: 82.0, // Maker price
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'seller1',
    });

    engine.processOrder(sellOrder);
    const result = engine.processOrder(buyOrder);

    expect(result.trades.length).toBe(1);
    expect(result.trades[0].price).toBe(82.0); // Maker price wins
    expect(result.trades[0].quantity).toBe(100);
  });

  it('should partially fill orders', () => {
    const buyOrder = new Order({
      market: 'STOCK-INR',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: 82.0,
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'buyer1',
    });

    const sellOrder = new Order({
      market: 'STOCK-INR',
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      price: 82.0,
      quantity: 50, // Less than buy order
      owner: OrderOwner.USER,
      ownerId: 'seller1',
    });

    engine.processOrder(sellOrder);
    const result = engine.processOrder(buyOrder);

    expect(result.trades.length).toBe(1);
    expect(result.trades[0].quantity).toBe(50);
    expect(sellOrder.status).toBe('FILLED');
    expect(buyOrder.status).toBe('PARTIALLY_FILLED');
    expect(buyOrder.remainingQuantity).toBe(50);
    expect(result.remainingOrder).toBe(buyOrder); // Should remain in book
  });

  it('should match multiple price levels', () => {
    // Add multiple sell orders at different prices
    engine.processOrder(
      new Order({
        market: 'STOCK-INR',
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        price: 82.0,
        quantity: 50,
        owner: OrderOwner.USER,
        ownerId: 'seller1',
      })
    );

    engine.processOrder(
      new Order({
        market: 'STOCK-INR',
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        price: 82.1,
        quantity: 50,
        owner: OrderOwner.USER,
        ownerId: 'seller2',
      })
    );

    // Large buy order that will match both
    const buyOrder = new Order({
      market: 'STOCK-INR',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: 82.5,
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'buyer1',
    });

    const result = engine.processOrder(buyOrder);

    expect(result.trades.length).toBe(2);
    expect(result.trades[0].price).toBe(82.0); // Best price first
    expect(result.trades[1].price).toBe(82.1);
    expect(buyOrder.status).toBe('FILLED');
  });

  it('should not match if price does not cross', () => {
    const buyOrder = new Order({
      market: 'STOCK-INR',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: 81.0, // Too low
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'buyer1',
    });

    const sellOrder = new Order({
      market: 'STOCK-INR',
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      price: 82.0, // Higher than buy
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'seller1',
    });

    engine.processOrder(sellOrder);
    const result = engine.processOrder(buyOrder);

    expect(result.trades.length).toBe(0);
    expect(buyOrder.status).toBe('NEW');
    expect(result.remainingOrder).toBe(buyOrder); // Should be in book
  });

  it('should cancel orders', () => {
    const order = new Order({
      market: 'STOCK-INR',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: 82.0,
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'user1',
    });

    engine.processOrder(order);
    const canceled = engine.cancelOrder(order.orderId);

    expect(canceled).toBe(true);
    expect(order.status).toBe('CANCELED');
  });
});

