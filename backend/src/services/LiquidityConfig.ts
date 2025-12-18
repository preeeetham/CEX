/**
 * Configuration for liquidity injection per market
 */
export interface LiquidityConfig {
  market: string;
  referencePrice: number;
  spread: number; // Total spread (e.g., 0.10 means 0.05 on each side)
  levels: number; // Number of price levels on each side
  levelGap: number; // Gap between price levels
  orderSizeBase: number; // Base order size
  orderSizeVariation: number; // Random variation in order size
  volatility: number; // Price volatility (standard deviation)
  drift: number; // Price drift per update (trend)
  minPrice?: number; // Minimum price bound
  maxPrice?: number; // Maximum price bound
  updateIntervalMs: number; // How often to update
}

/**
 * Default liquidity configuration
 */
export function createDefaultConfig(market: string, referencePrice: number): LiquidityConfig {
  return {
    market,
    referencePrice,
    spread: 0.10,
    levels: 5,
    levelGap: 0.10,
    orderSizeBase: 50,
    orderSizeVariation: 20,
    volatility: 2.0, // Increased volatility for dynamic market
    drift: 0.01, // Small drift for trending behavior
    updateIntervalMs: 500, // 0.5 seconds (500 milliseconds)
  };
}

