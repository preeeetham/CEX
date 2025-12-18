import { MarketManager } from './MarketManager';
import { LiquidityInjector } from './LiquidityInjector';
import { LiquidityConfig, createDefaultConfig } from './LiquidityConfig';
import { EventPublisher } from './EventPublisher';

/**
 * LiquidityScheduler manages periodic liquidity injection for all markets
 */
export class LiquidityScheduler {
  private readonly marketManager: MarketManager;
  private readonly eventPublisher?: EventPublisher;
  private readonly injectors: Map<string, LiquidityInjector> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private enabled: boolean = false;

  constructor(marketManager: MarketManager, eventPublisher?: EventPublisher) {
    this.marketManager = marketManager;
    this.eventPublisher = eventPublisher;
  }

  /**
   * Start liquidity injection for a market
   */
  startMarket(marketId: string, config?: Partial<LiquidityConfig>): void {
    const market = this.marketManager.getMarket(marketId);
    if (!market) {
      throw new Error(`Market ${marketId} does not exist`);
    }

    const engine = this.marketManager.getEngine(marketId);
    if (!engine) {
      throw new Error(`Matching engine for ${marketId} not found`);
    }

    // Get or create injector
    let injector = this.injectors.get(marketId);
    if (!injector) {
      // Get initial price from order book or use default
      const orderBook = engine.getOrderBook();
      const bestBid = orderBook.getBestBidPrice();
      const bestAsk = orderBook.getBestAskPrice();
      const initialPrice = bestBid || bestAsk || 82.0; // Default fallback

      const fullConfig = {
        ...createDefaultConfig(marketId, initialPrice),
        ...config,
      };

      injector = new LiquidityInjector(marketId, fullConfig, engine, market, this.eventPublisher);
      this.injectors.set(marketId, injector);
    } else if (config) {
      // Update existing injector config
      injector.updateConfig(config);
    }

    // Stop existing interval if any
    this.stopMarket(marketId);

    // Start injection cycle
    const injectorConfig = injector.getConfig();
    const interval = setInterval(() => {
      try {
        injector.inject();
      } catch (error) {
        console.error(`Error injecting liquidity for ${marketId}:`, error);
      }
    }, injectorConfig.updateIntervalMs);

    this.intervals.set(marketId, interval);
    this.enabled = true;

    // Inject immediately
    injector.inject();
  }

  /**
   * Stop liquidity injection for a market
   */
  stopMarket(marketId: string): void {
    const interval = this.intervals.get(marketId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(marketId);
    }

    // Cancel all system orders for this market
    const injector = this.injectors.get(marketId);
    if (injector) {
      // This will be handled by the injector's cancelAllSystemOrders
    }
  }

  /**
   * Start liquidity injection for all configured markets
   */
  startAll(): void {
    const markets = this.marketManager.getActiveMarkets();
    for (const market of markets) {
      try {
        this.startMarket(market.marketId);
      } catch (error) {
        console.error(`Failed to start liquidity for ${market.marketId}:`, error);
      }
    }
  }

  /**
   * Stop all liquidity injection
   */
  stopAll(): void {
    for (const marketId of this.intervals.keys()) {
      this.stopMarket(marketId);
    }
  }

  /**
   * Manually trigger injection for a market
   */
  injectMarket(marketId: string): { ordersCreated: number; ordersCanceled: number; referencePrice: number } {
    const injector = this.injectors.get(marketId);
    if (!injector) {
      throw new Error(`Liquidity injector for ${marketId} not found. Start the market first.`);
    }

    return injector.inject();
  }

  /**
   * Check if a market has active liquidity injection
   */
  isMarketActive(marketId: string): boolean {
    return this.intervals.has(marketId);
  }

  /**
   * Get injector for a market
   */
  getInjector(marketId: string): LiquidityInjector | undefined {
    return this.injectors.get(marketId);
  }

  /**
   * Enable/disable scheduler
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  /**
   * Check if scheduler is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

