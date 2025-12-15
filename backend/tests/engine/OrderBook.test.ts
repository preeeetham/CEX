import { OrderBook } from '../../src/engine/OrderBook';
import { Order } from '../../src/models/Order';
import { OrderSide, OrderType, OrderOwner } from '../../src/models/types';

describe('OrderBook', () => {
  let orderBook: OrderBook;

  beforeEach(() => {
    orderBook = new OrderBook('STOCK-INR');
  });

  it('should add buy orders', () => {
    const order = new Order({
      market: 'STOCK-INR',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: 82.0,
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'user1',
    });

    orderBook.addOrder(order);
    const bestBid = orderBook.getBestBid();

    expect(bestBid).toBe(order);
    expect(bestBid?.price).toBe(82.0);
  });

  it('should add sell orders', () => {
    const order = new Order({
      market: 'STOCK-INR',
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      price: 82.5,
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'user1',
    });

    orderBook.addOrder(order);
    const bestAsk = orderBook.getBestAsk();

    expect(bestAsk).toBe(order);
    expect(bestAsk?.price).toBe(82.5);
  });

  it('should maintain price-time priority for bids', () => {
    const order1 = new Order({
      market: 'STOCK-INR',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: 82.0,
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'user1',
    });

    const order2 = new Order({
      market: 'STOCK-INR',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: 82.0,
      quantity: 50,
      owner: OrderOwner.USER,
      ownerId: 'user2',
    });

    orderBook.addOrder(order1);
    orderBook.addOrder(order2);

    const bestBid = orderBook.getBestBid();
    expect(bestBid).toBe(order1); // First order should be first
  });

  it('should return highest bid price', () => {
    orderBook.addOrder(
      new Order({
        market: 'STOCK-INR',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        price: 81.5,
        quantity: 100,
        owner: OrderOwner.USER,
        ownerId: 'user1',
      })
    );

    orderBook.addOrder(
      new Order({
        market: 'STOCK-INR',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        price: 82.0,
        quantity: 100,
        owner: OrderOwner.USER,
        ownerId: 'user2',
      })
    );

    expect(orderBook.getBestBidPrice()).toBe(82.0);
  });

  it('should return lowest ask price', () => {
    orderBook.addOrder(
      new Order({
        market: 'STOCK-INR',
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        price: 82.5,
        quantity: 100,
        owner: OrderOwner.USER,
        ownerId: 'user1',
      })
    );

    orderBook.addOrder(
      new Order({
        market: 'STOCK-INR',
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        price: 82.0,
        quantity: 100,
        owner: OrderOwner.USER,
        ownerId: 'user2',
      })
    );

    expect(orderBook.getBestAskPrice()).toBe(82.0);
  });

  it('should calculate spread', () => {
    orderBook.addOrder(
      new Order({
        market: 'STOCK-INR',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        price: 82.0,
        quantity: 100,
        owner: OrderOwner.USER,
        ownerId: 'user1',
      })
    );

    orderBook.addOrder(
      new Order({
        market: 'STOCK-INR',
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        price: 82.5,
        quantity: 100,
        owner: OrderOwner.USER,
        ownerId: 'user2',
      })
    );

    expect(orderBook.getSpread()).toBe(0.5);
  });

  it('should remove orders', () => {
    const order = new Order({
      market: 'STOCK-INR',
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: 82.0,
      quantity: 100,
      owner: OrderOwner.USER,
      ownerId: 'user1',
    });

    orderBook.addOrder(order);
    expect(orderBook.getBestBid()).toBe(order);

    const removed = orderBook.removeOrder(order.orderId);
    expect(removed).toBe(true);
    expect(orderBook.getBestBid()).toBeNull();
  });

  it('should generate order book snapshot', () => {
    orderBook.addOrder(
      new Order({
        market: 'STOCK-INR',
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        price: 82.0,
        quantity: 100,
        owner: OrderOwner.USER,
        ownerId: 'user1',
      })
    );

    orderBook.addOrder(
      new Order({
        market: 'STOCK-INR',
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        price: 82.5,
        quantity: 150,
        owner: OrderOwner.USER,
        ownerId: 'user2',
      })
    );

    const snapshot = orderBook.getSnapshot();

    expect(snapshot.market).toBe('STOCK-INR');
    expect(snapshot.bids.length).toBeGreaterThan(0);
    expect(snapshot.asks.length).toBeGreaterThan(0);
    expect(snapshot.bids[0][0]).toBe('82.00');
    expect(snapshot.asks[0][0]).toBe('82.50');
  });
});

