import { Order } from '../models/Order';
import { Trade } from '../models/Trade';
import { OrderBook } from './OrderBook';
import { OrderSide, OrderType } from '../models/types';

/**
 * MatchingEngine handles order matching and trade execution
 * Implements price-time priority matching
 */
export class MatchingEngine {
  private readonly orderBook: OrderBook;
  private readonly trades: Trade[] = [];
  private readonly maxTradesHistory: number = 1000;

  constructor(market: string) {
    this.orderBook = new OrderBook(market);
  }

  /**
   * Process an incoming order
   * Returns: trades executed, remaining order (if partially filled)
   */
  processOrder(order: Order): { trades: Trade[]; remainingOrder: Order | null } {
    const trades: Trade[] = [];

    if (order.type === OrderType.MARKET) {
      // Market orders match immediately at best available price
      const result = this.matchMarketOrder(order);
      trades.push(...result.trades);
    } else {
      // Limit orders match against opposite side
      const result = this.matchLimitOrder(order);
      trades.push(...result.trades);
    }

    // Add trades to history
    for (const trade of trades) {
      this.addTrade(trade);
      this.orderBook.updateLastTrade(trade.price, trade.timestamp);
    }

    // If order still has remaining quantity, add to book
    if (order.remainingQuantity > 0 && order.status !== 'FILLED') {
      this.orderBook.addOrder(order);
      return { trades, remainingOrder: order };
    }

    return { trades, remainingOrder: null };
  }

  /**
   * Match a limit order against the opposite side
   */
  private matchLimitOrder(order: Order): { trades: Trade[] } {
    const trades: Trade[] = [];

    if (order.side === OrderSide.BUY) {
      // Match against asks (sellers)
      while (order.remainingQuantity > 0) {
        const bestAsk = this.orderBook.getBestAsk();

        if (!bestAsk || bestAsk.price > order.price) {
          break; // No more matches possible
        }

        const trade = this.executeTrade(order, bestAsk);
        trades.push(trade);
      }
    } else {
      // Match against bids (buyers)
      while (order.remainingQuantity > 0) {
        const bestBid = this.orderBook.getBestBid();

        if (!bestBid || bestBid.price < order.price) {
          break; // No more matches possible
        }

        const trade = this.executeTrade(order, bestBid);
        trades.push(trade);
      }
    }

    return { trades };
  }

  /**
   * Match a market order (matches at best available price)
   */
  private matchMarketOrder(order: Order): { trades: Trade[] } {
    const trades: Trade[] = [];

    if (order.side === OrderSide.BUY) {
      // Market buy: match against asks
      while (order.remainingQuantity > 0) {
        const bestAsk = this.orderBook.getBestAsk();

        if (!bestAsk) {
          // No liquidity available
          order.reject();
          break;
        }

        const trade = this.executeTrade(order, bestAsk);
        trades.push(trade);
      }
    } else {
      // Market sell: match against bids
      while (order.remainingQuantity > 0) {
        const bestBid = this.orderBook.getBestBid();

        if (!bestBid) {
          // No liquidity available
          order.reject();
          break;
        }

        const trade = this.executeTrade(order, bestBid);
        trades.push(trade);
      }
    }

    return { trades };
  }

  /**
   * Execute a trade between two orders
   * Maker price wins (price-time priority)
   */
  private executeTrade(takerOrder: Order, makerOrder: Order): Trade {
    const tradeQuantity = Math.min(
      takerOrder.remainingQuantity,
      makerOrder.remainingQuantity
    );
    const tradePrice = makerOrder.price; // Maker price wins

    // Fill both orders
    takerOrder.fill(tradeQuantity);
    makerOrder.fill(tradeQuantity);

    // Remove maker from book if fully filled
    if (makerOrder.remainingQuantity === 0) {
      this.orderBook.removeOrder(makerOrder.orderId);
    }

    // Create trade record
    const trade = new Trade({
      market: takerOrder.market,
      price: tradePrice,
      quantity: tradeQuantity,
      takerOrderId: takerOrder.orderId,
      makerOrderId: makerOrder.orderId,
      takerSide: takerOrder.side,
    });

    return trade;
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): boolean {
    const order = this.orderBook.getOrder(orderId);
    if (!order) {
      return false;
    }

    order.cancel();
    return this.orderBook.removeOrder(orderId);
  }

  /**
   * Get order book
   */
  getOrderBook(): OrderBook {
    return this.orderBook;
  }

  /**
   * Get recent trades
   */
  getRecentTrades(limit: number = 50): Trade[] {
    return this.trades.slice(-limit).reverse();
  }

  /**
   * Get all trades
   */
  getAllTrades(): Trade[] {
    return [...this.trades];
  }

  /**
   * Add trade to history (with size limit)
   */
  private addTrade(trade: Trade): void {
    this.trades.push(trade);
    if (this.trades.length > this.maxTradesHistory) {
      this.trades.shift(); // Remove oldest trade
    }
  }
}

