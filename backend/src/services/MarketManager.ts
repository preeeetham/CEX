import { Market } from '../models/Market';
import { MatchingEngine } from '../engine/MatchingEngine';

/**
 * MarketManager manages multiple markets and their matching engines
 */
export class MarketManager {
  private readonly markets: Map<string, Market> = new Map();
  private readonly engines: Map<string, MatchingEngine> = new Map();

  /**
   * Register a new market
   */
  registerMarket(market: Market): void {
    this.markets.set(market.marketId, market);
    this.engines.set(market.marketId, new MatchingEngine(market.marketId));
  }

  /**
   * Get a market by ID
   */
  getMarket(marketId: string): Market | undefined {
    return this.markets.get(marketId);
  }

  /**
   * Get matching engine for a market
   */
  getEngine(marketId: string): MatchingEngine | undefined {
    return this.engines.get(marketId);
  }

  /**
   * Check if market exists
   */
  hasMarket(marketId: string): boolean {
    return this.markets.has(marketId);
  }

  /**
   * Get all markets
   */
  getAllMarkets(): Market[] {
    return Array.from(this.markets.values());
  }

  /**
   * Get active markets
   */
  getActiveMarkets(): Market[] {
    return Array.from(this.markets.values()).filter((m) => m.isActive());
  }
}

