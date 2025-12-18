import { Order, OrderSide, OrderType, OrderOwner } from '../models';
import { MatchingEngine } from '../engine/MatchingEngine';
import { ReferencePriceEngine } from './ReferencePriceEngine';
import { LiquidityConfig } from './LiquidityConfig';
import { Market } from '../models/Market';
import { EventPublisher } from './EventPublisher';

/**
 * LiquidityInjector manages synthetic order placement for market making
 */
export class LiquidityInjector {
  private readonly market: string;
  private readonly config: LiquidityConfig;
  private readonly priceEngine: ReferencePriceEngine;
  private readonly matchingEngine: MatchingEngine;
  private readonly marketConfig: Market;
  private readonly eventPublisher?: EventPublisher;
  private systemOrderIds: Set<string> = new Set(); // Track system orders for cancellation

  constructor(
    market: string,
    config: LiquidityConfig,
    matchingEngine: MatchingEngine,
    marketConfig: Market,
    eventPublisher?: EventPublisher
  ) {
    this.market = market;
    this.config = config;
    this.matchingEngine = matchingEngine;
    this.marketConfig = marketConfig;
    this.eventPublisher = eventPublisher;

    // Initialize price engine
    this.priceEngine = new ReferencePriceEngine({
      initialPrice: config.referencePrice,
      volatility: config.volatility,
      drift: config.drift,
      minPrice: config.minPrice,
      maxPrice: config.maxPrice,
    });
  }

  /**
   * Execute one liquidity injection cycle
   * 1. Cancel existing system orders
   * 2. Update reference price
   * 3. Generate and place new orders
   */
  inject(): { ordersCreated: number; ordersCanceled: number; referencePrice: number } {
    // Step 1: Cancel all existing system orders
    const canceledCount = this.cancelAllSystemOrders();

    // Step 2: Update reference price
    const newPrice = this.priceEngine.updatePrice();

    // Step 3: Generate and place new orders
    const bidOrders = this.generateBidOrders(newPrice);
    const askOrders = this.generateAskOrders(newPrice);

    // Step 4: Submit orders to matching engine
    let createdCount = 0;
    for (const order of [...bidOrders, ...askOrders]) {
      this.matchingEngine.processOrder(order);
      this.systemOrderIds.add(order.orderId);
      createdCount++;
    }

    // Step 5: Publish orderbook update if eventPublisher is available
    if (this.eventPublisher && createdCount > 0) {
      const snapshot = this.matchingEngine.getOrderBook().getSnapshot(20);
      this.eventPublisher.publishMarketEvent(
        this.eventPublisher.createOrderbookUpdatedEvent(this.market, snapshot)
      );
    }

    return {
      ordersCreated: createdCount,
      ordersCanceled: canceledCount,
      referencePrice: newPrice,
    };
  }

  /**
   * Cancel all system orders for this market
   */
  private cancelAllSystemOrders(): number {
    let canceledCount = 0;
    const orderIdsToCancel = Array.from(this.systemOrderIds);

    for (const orderId of orderIdsToCancel) {
      const canceled = this.matchingEngine.cancelOrder(orderId);
      if (canceled) {
        this.systemOrderIds.delete(orderId);
        canceledCount++;
      }
    }

    return canceledCount;
  }

  /**
   * Generate bid orders (buy orders below reference price)
   */
  private generateBidOrders(referencePrice: number): Order[] {
    const orders: Order[] = [];
    const halfSpread = this.config.spread / 2;
    const startPrice = referencePrice - halfSpread;

    for (let i = 0; i < this.config.levels; i++) {
      const price = startPrice - i * this.config.levelGap;
      const roundedPrice = this.roundToTick(price);

      // Skip if price is too low
      if (roundedPrice < (this.config.minPrice || 0)) {
        continue;
      }

      const quantity = this.generateOrderSize();
      const order = new Order({
        market: this.market,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        price: roundedPrice,
        quantity,
        owner: OrderOwner.SYSTEM,
        ownerId: 'system',
      });

      orders.push(order);
    }

    return orders;
  }

  /**
   * Generate ask orders (sell orders above reference price)
   */
  private generateAskOrders(referencePrice: number): Order[] {
    const orders: Order[] = [];
    const halfSpread = this.config.spread / 2;
    const startPrice = referencePrice + halfSpread;

    for (let i = 0; i < this.config.levels; i++) {
      const price = startPrice + i * this.config.levelGap;
      const roundedPrice = this.roundToTick(price);

      // Skip if price is too high
      if (this.config.maxPrice && roundedPrice > this.config.maxPrice) {
        continue;
      }

      const quantity = this.generateOrderSize();
      const order = new Order({
        market: this.market,
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        price: roundedPrice,
        quantity,
        owner: OrderOwner.SYSTEM,
        ownerId: 'system',
      });

      orders.push(order);
    }

    return orders;
  }

  /**
   * Generate order size with random variation
   */
  private generateOrderSize(): number {
    const variation = (this.priceEngine.random() - 0.5) * 2 * this.config.orderSizeVariation;
    const size = Math.round(this.config.orderSizeBase + variation);
    return Math.max(1, size); // Ensure at least 1
  }

  /**
   * Round price to nearest tick size
   */
  private roundToTick(price: number): number {
    // Use same logic as validator
    return Math.round(price / this.marketConfig.tickSize) * this.marketConfig.tickSize;
  }

  /**
   * Get current reference price
   */
  getReferencePrice(): number {
    return this.priceEngine.getPrice();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LiquidityConfig>): void {
    Object.assign(this.config, config);
    
    if (config.volatility !== undefined) {
      // Update price engine volatility would require engine modification
      // For now, we'll just update the config
    }
  }

  /**
   * Get configuration
   */
  getConfig(): LiquidityConfig {
    return { ...this.config };
  }
}


