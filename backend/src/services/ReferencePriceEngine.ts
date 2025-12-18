/**
 * ReferencePriceEngine generates synthetic fair prices with drift and noise
 * Uses seeded PRNG for determinism
 */
export class ReferencePriceEngine {
  private referencePrice: number;
  private readonly volatility: number;
  private readonly drift: number;
  private readonly minPrice: number;
  private readonly maxPrice: number;
  private seed: number;
  private lastUpdateTime: number;

  constructor(params: {
    initialPrice: number;
    volatility: number;
    drift: number;
    minPrice?: number;
    maxPrice?: number;
    seed?: number;
  }) {
    this.referencePrice = params.initialPrice;
    this.volatility = params.volatility;
    this.drift = params.drift;
    this.minPrice = params.minPrice || params.initialPrice * 0.5;
    this.maxPrice = params.maxPrice || params.initialPrice * 2.0;
    this.seed = params.seed || Date.now();
    this.lastUpdateTime = Date.now();
  }

  /**
   * Get current reference price
   */
  getPrice(): number {
    return this.referencePrice;
  }

  /**
   * Update reference price with drift and noise
   * Returns the new price
   */
  updatePrice(): number {
    const now = Date.now();
    const timeDelta = (now - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = now;

    // Calculate drift component (trend) - scale by time delta for consistency
    const driftComponent = this.drift * timeDelta * 100; // Scale for faster updates

    // Generate random noise (normal distribution approximation)
    // For very frequent updates (10ms), scale volatility appropriately
    // Use a minimum multiplier to ensure price movement even with small timeDelta
    const timeScale = Math.max(timeDelta * 100, 0.01); // Minimum scale for small timeDelta
    const noise = this.generateNormalRandom() * this.volatility * Math.sqrt(timeScale);

    // Update price
    let newPrice = this.referencePrice + driftComponent + noise;

    // Apply bounds
    newPrice = Math.max(this.minPrice, Math.min(this.maxPrice, newPrice));

    this.referencePrice = newPrice;
    return newPrice;
  }

  /**
   * Set reference price directly (for manual updates)
   */
  setPrice(price: number): void {
    this.referencePrice = Math.max(this.minPrice, Math.min(this.maxPrice, price));
  }

  /**
   * Generate a pseudo-random number with normal distribution approximation
   * Using Box-Muller transform for better distribution
   */
  private generateNormalRandom(): number {
    // Simple seeded PRNG (Linear Congruential Generator)
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    const u1 = this.seed / 0x7fffffff;
    
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    const u2 = this.seed / 0x7fffffff;

    // Box-Muller transform for normal distribution
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0;
  }

  /**
   * Generate a random number between 0 and 1
   */
  random(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  /**
   * Set seed for deterministic behavior
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }

  /**
   * Get current seed
   */
  getSeed(): number {
    return this.seed;
  }
}


