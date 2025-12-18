import { ReferencePriceEngine } from '../../src/services/ReferencePriceEngine';

describe('ReferencePriceEngine', () => {
  it('should initialize with initial price', () => {
    const engine = new ReferencePriceEngine({
      initialPrice: 82.0,
      volatility: 0.5,
      drift: 0.0,
    });

    expect(engine.getPrice()).toBe(82.0);
  });

  it('should update price with drift and noise', () => {
    const engine = new ReferencePriceEngine({
      initialPrice: 82.0,
      volatility: 0.1,
      drift: 0.01, // Small positive drift
      seed: 12345, // Fixed seed for determinism
    });

    const initialPrice = engine.getPrice();
    const newPrice = engine.updatePrice();

    // Price should change (either up or down due to noise)
    expect(newPrice).not.toBe(initialPrice);
    expect(newPrice).toBeGreaterThan(0);
  });

  it('should respect price bounds', () => {
    const engine = new ReferencePriceEngine({
      initialPrice: 82.0,
      volatility: 10.0, // High volatility
      drift: 0.0,
      minPrice: 80.0,
      maxPrice: 85.0,
    });

    // Update many times with high volatility
    for (let i = 0; i < 100; i++) {
      engine.updatePrice();
      const price = engine.getPrice();
      expect(price).toBeGreaterThanOrEqual(80.0);
      expect(price).toBeLessThanOrEqual(85.0);
    }
  });

  it('should be deterministic with same seed', () => {
    const engine1 = new ReferencePriceEngine({
      initialPrice: 82.0,
      volatility: 0.5,
      drift: 0.0,
      seed: 12345,
    });

    const engine2 = new ReferencePriceEngine({
      initialPrice: 82.0,
      volatility: 0.5,
      drift: 0.0,
      seed: 12345,
    });

    // Both should produce same sequence
    const price1 = engine1.updatePrice();
    const price2 = engine2.updatePrice();

    expect(price1).toBe(price2);
  });

  it('should set price directly', () => {
    const engine = new ReferencePriceEngine({
      initialPrice: 82.0,
      volatility: 0.5,
      drift: 0.0,
    });

    engine.setPrice(85.0);
    expect(engine.getPrice()).toBe(85.0);
  });

  it('should clamp price when setting outside bounds', () => {
    const engine = new ReferencePriceEngine({
      initialPrice: 82.0,
      volatility: 0.5,
      drift: 0.0,
      minPrice: 80.0,
      maxPrice: 85.0,
    });

    engine.setPrice(90.0);
    expect(engine.getPrice()).toBe(85.0);

    engine.setPrice(70.0);
    expect(engine.getPrice()).toBe(80.0);
  });
});

