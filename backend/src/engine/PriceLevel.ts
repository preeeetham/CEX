import { Order } from '../models/Order';

/**
 * PriceLevel represents all orders at a specific price
 * Maintains FIFO queue for price-time priority
 */
export class PriceLevel {
  private readonly price: number;
  private readonly orders: Order[] = [];

  constructor(price: number) {
    this.price = price;
  }

  /**
   * Get the price of this level
   */
  getPrice(): number {
    return this.price;
  }

  /**
   * Add an order to this price level (FIFO)
   */
  addOrder(order: Order): void {
    this.orders.push(order);
  }

  /**
   * Remove an order from this price level
   */
  removeOrder(orderId: string): boolean {
    const index = this.orders.findIndex((o) => o.orderId === orderId);
    if (index !== -1) {
      this.orders.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get the first order (oldest) at this price level
   */
  getFirstOrder(): Order | null {
    return this.orders.length > 0 ? this.orders[0] : null;
  }

  /**
   * Get all orders at this level
   */
  getOrders(): Order[] {
    return [...this.orders];
  }

  /**
   * Get total quantity at this price level
   */
  getTotalQuantity(): number {
    return this.orders.reduce((sum, order) => sum + order.remainingQuantity, 0);
  }

  /**
   * Check if this level is empty
   */
  isEmpty(): boolean {
    return this.orders.length === 0;
  }

  /**
   * Get number of orders at this level
   */
  getOrderCount(): number {
    return this.orders.length;
  }
}

