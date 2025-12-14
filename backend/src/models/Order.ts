import { Order as IOrder, OrderSide, OrderType, OrderStatus, OrderOwner } from './types';
import { randomUUID } from 'crypto';

/**
 * Order class representing a trading order
 */
export class Order implements IOrder {
  orderId: string;
  market: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  quantity: number;
  remainingQuantity: number;
  filledQuantity: number;
  owner: OrderOwner;
  ownerId: string;
  status: OrderStatus;
  timestamp: number;
  lastUpdateTime: number;

  constructor(params: {
    market: string;
    side: OrderSide;
    type: OrderType;
    price: number;
    quantity: number;
    owner: OrderOwner;
    ownerId: string;
    orderId?: string;
    timestamp?: number;
  }) {
    this.orderId = params.orderId || randomUUID();
    this.market = params.market;
    this.side = params.side;
    this.type = params.type;
    this.price = params.price;
    this.quantity = params.quantity;
    this.remainingQuantity = params.quantity;
    this.filledQuantity = 0;
    this.owner = params.owner;
    this.ownerId = params.ownerId;
    this.status = OrderStatus.NEW;
    this.timestamp = params.timestamp || Date.now();
    this.lastUpdateTime = this.timestamp;
  }

  /**
   * Fill a portion of this order
   */
  fill(quantity: number): void {
    if (quantity > this.remainingQuantity) {
      throw new Error('Cannot fill more than remaining quantity');
    }

    this.remainingQuantity -= quantity;
    this.filledQuantity += quantity;
    this.lastUpdateTime = Date.now();

    this.updateStatus();
  }

  /**
   * Cancel this order
   */
  cancel(): void {
    if (this.status === OrderStatus.FILLED) {
      throw new Error('Cannot cancel a filled order');
    }
    if (this.status === OrderStatus.CANCELED) {
      throw new Error('Order already canceled');
    }

    this.status = OrderStatus.CANCELED;
    this.lastUpdateTime = Date.now();
  }

  /**
   * Reject this order
   */
  reject(): void {
    this.status = OrderStatus.REJECTED;
    this.lastUpdateTime = Date.now();
  }

  /**
   * Update order status based on fill state
   */
  private updateStatus(): void {
    if (this.remainingQuantity === 0) {
      this.status = OrderStatus.FILLED;
    } else if (this.filledQuantity > 0) {
      this.status = OrderStatus.PARTIALLY_FILLED;
    }
  }

  /**
   * Convert to plain object
   */
  toJSON(): IOrder {
    return {
      orderId: this.orderId,
      market: this.market,
      side: this.side,
      type: this.type,
      price: this.price,
      quantity: this.quantity,
      remainingQuantity: this.remainingQuantity,
      filledQuantity: this.filledQuantity,
      owner: this.owner,
      ownerId: this.ownerId,
      status: this.status,
      timestamp: this.timestamp,
      lastUpdateTime: this.lastUpdateTime,
    };
  }
}

