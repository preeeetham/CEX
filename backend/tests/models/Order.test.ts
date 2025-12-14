import { Order } from '../../src/models/Order';
import { OrderSide, OrderType, OrderStatus, OrderOwner } from '../../src/models/types';

describe('Order', () => {
  const baseOrderParams = {
    market: 'STOCK-INR',
    side: OrderSide.BUY,
    type: OrderType.LIMIT,
    price: 82.0,
    quantity: 100,
    owner: OrderOwner.USER,
    ownerId: 'user123',
  };

  it('should create a new order with correct initial state', () => {
    const order = new Order(baseOrderParams);

    expect(order.market).toBe('STOCK-INR');
    expect(order.side).toBe(OrderSide.BUY);
    expect(order.type).toBe(OrderType.LIMIT);
    expect(order.price).toBe(82.0);
    expect(order.quantity).toBe(100);
    expect(order.remainingQuantity).toBe(100);
    expect(order.filledQuantity).toBe(0);
    expect(order.status).toBe(OrderStatus.NEW);
    expect(order.owner).toBe(OrderOwner.USER);
    expect(order.ownerId).toBe('user123');
    expect(order.orderId).toBeDefined();
    expect(order.timestamp).toBeDefined();
  });

  it('should fill order partially', () => {
    const order = new Order(baseOrderParams);
    order.fill(50);

    expect(order.remainingQuantity).toBe(50);
    expect(order.filledQuantity).toBe(50);
    expect(order.status).toBe(OrderStatus.PARTIALLY_FILLED);
  });

  it('should fill order completely', () => {
    const order = new Order(baseOrderParams);
    order.fill(100);

    expect(order.remainingQuantity).toBe(0);
    expect(order.filledQuantity).toBe(100);
    expect(order.status).toBe(OrderStatus.FILLED);
  });

  it('should throw error when filling more than remaining quantity', () => {
    const order = new Order(baseOrderParams);
    order.fill(50);

    expect(() => order.fill(60)).toThrow('Cannot fill more than remaining quantity');
  });

  it('should cancel order', () => {
    const order = new Order(baseOrderParams);
    order.cancel();

    expect(order.status).toBe(OrderStatus.CANCELED);
  });

  it('should reject order', () => {
    const order = new Order(baseOrderParams);
    order.reject();

    expect(order.status).toBe(OrderStatus.REJECTED);
  });

  it('should throw error when canceling filled order', () => {
    const order = new Order(baseOrderParams);
    order.fill(100);

    expect(() => order.cancel()).toThrow('Cannot cancel a filled order');
  });

  it('should update lastUpdateTime on fill', () => {
    const order = new Order(baseOrderParams);
    const initialTime = order.lastUpdateTime;
    
    // Wait a bit to ensure time difference
    const waitTime = new Promise(resolve => setTimeout(resolve, 10));
    
    waitTime.then(() => {
      order.fill(50);
      expect(order.lastUpdateTime).toBeGreaterThan(initialTime);
    });
  });
});

