import { Order } from '../models/Order';
import { PriceLevel } from './PriceLevel';
import { OrderSide, OrderBookSnapshot } from '../models/types';

/**
 * OrderBook maintains bid and ask sides of the order book
 * Bids: sorted descending (highest first)
 * Asks: sorted ascending (lowest first)
 */
export class OrderBook {
  private readonly market: string;
  private readonly bids: Map<number, PriceLevel> = new Map(); // price -> PriceLevel
  private readonly asks: Map<number, PriceLevel> = new Map(); // price -> PriceLevel
  private readonly orderMap: Map<string, Order> = new Map(); // orderId -> Order
  private lastTradePrice?: number;
  private lastTradeTime?: number;

  constructor(market: string) {
    this.market = market;
  }

  /**
   * Add an order to the order book
   */
  addOrder(order: Order): void {
    this.orderMap.set(order.orderId, order);

    if (order.side === OrderSide.BUY) {
      this.addToSide(order, this.bids);
    } else {
      this.addToSide(order, this.asks);
    }
  }

  /**
   * Remove an order from the order book
   */
  removeOrder(orderId: string): boolean {
    const order = this.orderMap.get(orderId);
    if (!order) {
      return false;
    }

    this.orderMap.delete(orderId);

    if (order.side === OrderSide.BUY) {
      return this.removeFromSide(orderId, order.price, this.bids);
    } else {
      return this.removeFromSide(orderId, order.price, this.asks);
    }
  }

  /**
   * Get an order by ID
   */
  getOrder(orderId: string): Order | undefined {
    return this.orderMap.get(orderId);
  }

  /**
   * Get the best bid (highest buy price)
   */
  getBestBid(): Order | null {
    if (this.bids.size === 0) {
      return null;
    }

    const highestPrice = Math.max(...this.bids.keys());
    const priceLevel = this.bids.get(highestPrice);
    return priceLevel?.getFirstOrder() || null;
  }

  /**
   * Get the best ask (lowest sell price)
   */
  getBestAsk(): Order | null {
    if (this.asks.size === 0) {
      return null;
    }

    const lowestPrice = Math.min(...this.asks.keys());
    const priceLevel = this.asks.get(lowestPrice);
    return priceLevel?.getFirstOrder() || null;
  }

  /**
   * Get the best bid price
   */
  getBestBidPrice(): number | null {
    const bestBid = this.getBestBid();
    return bestBid ? bestBid.price : null;
  }

  /**
   * Get the best ask price
   */
  getBestAskPrice(): number | null {
    const bestAsk = this.getBestAsk();
    return bestAsk ? bestAsk.price : null;
  }

  /**
   * Get spread (difference between best ask and best bid)
   */
  getSpread(): number | null {
    const bestBid = this.getBestBidPrice();
    const bestAsk = this.getBestAskPrice();

    if (bestBid === null || bestAsk === null) {
      return null;
    }

    return bestAsk - bestBid;
  }

  /**
   * Get mid price (average of best bid and ask)
   */
  getMidPrice(): number | null {
    const bestBid = this.getBestBidPrice();
    const bestAsk = this.getBestAskPrice();

    if (bestBid === null || bestAsk === null) {
      return null;
    }

    return (bestBid + bestAsk) / 2;
  }

  /**
   * Update last trade information
   */
  updateLastTrade(price: number, timestamp: number): void {
    this.lastTradePrice = price;
    this.lastTradeTime = timestamp;
  }

  /**
   * Get order book snapshot
   */
  getSnapshot(depth: number = 10): OrderBookSnapshot {
    const bids: [string, string][] = [];
    const asks: [string, string][] = [];

    // Get bids (descending order)
    const sortedBidPrices = Array.from(this.bids.keys())
      .sort((a, b) => b - a)
      .slice(0, depth);

    for (const price of sortedBidPrices) {
      const level = this.bids.get(price);
      if (level) {
        bids.push([price.toFixed(2), level.getTotalQuantity().toString()]);
      }
    }

    // Get asks (ascending order)
    const sortedAskPrices = Array.from(this.asks.keys())
      .sort((a, b) => a - b)
      .slice(0, depth);

    for (const price of sortedAskPrices) {
      const level = this.asks.get(price);
      if (level) {
        asks.push([price.toFixed(2), level.getTotalQuantity().toString()]);
      }
    }

    return {
      market: this.market,
      timestamp: Date.now(),
      bids,
      asks,
      lastTradePrice: this.lastTradePrice,
      lastTradeTime: this.lastTradeTime,
      spread: this.getSpread() || undefined,
      midPrice: this.getMidPrice() || undefined,
    };
  }

  /**
   * Get all orders for a specific side
   */
  getOrdersBySide(side: OrderSide): Order[] {
    const orders: Order[] = [];
    const sideMap = side === OrderSide.BUY ? this.bids : this.asks;

    for (const level of sideMap.values()) {
      orders.push(...level.getOrders());
    }

    return orders;
  }

  /**
   * Add order to a specific side (bids or asks)
   */
  private addToSide(order: Order, side: Map<number, PriceLevel>): void {
    const price = order.price;
    let level = side.get(price);

    if (!level) {
      level = new PriceLevel(price);
      side.set(price, level);
    }

    level.addOrder(order);
  }

  /**
   * Remove order from a specific side
   */
  private removeFromSide(
    orderId: string,
    price: number,
    side: Map<number, PriceLevel>
  ): boolean {
    const level = side.get(price);
    if (!level) {
      return false;
    }

    const removed = level.removeOrder(orderId);
    if (removed && level.isEmpty()) {
      side.delete(price);
    }

    return removed;
  }
}

