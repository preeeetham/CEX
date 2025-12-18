import { LiquidityScheduler } from '../../src/services/LiquidityScheduler';
import { MarketManager } from '../../src/services/MarketManager';
import { Market } from '../../src/models/Market';

describe('LiquidityScheduler', () => {
  let scheduler: LiquidityScheduler;
  let marketManager: MarketManager;

  beforeEach(() => {
    marketManager = new MarketManager();
    scheduler = new LiquidityScheduler(marketManager);

    marketManager.registerMarket(
      new Market({
        marketId: 'STOCK-INR',
        baseAsset: 'STOCK',
        quoteAsset: 'INR',
        tickSize: 0.01,
        minQuantity: 1,
        maxQuantity: 1000000,
        status: 'ACTIVE',
      })
    );
  });

  afterEach(() => {
    scheduler.stopAll();
  });

  it('should start liquidity injection for a market', () => {
    scheduler.startMarket('STOCK-INR');

    expect(scheduler.isMarketActive('STOCK-INR')).toBe(true);
    expect(scheduler.getInjector('STOCK-INR')).toBeDefined();
  });

  it('should stop liquidity injection for a market', () => {
    scheduler.startMarket('STOCK-INR');
    expect(scheduler.isMarketActive('STOCK-INR')).toBe(true);

    scheduler.stopMarket('STOCK-INR');
    expect(scheduler.isMarketActive('STOCK-INR')).toBe(false);
  });

  it('should manually inject liquidity for a market', () => {
    scheduler.startMarket('STOCK-INR');

    const result = scheduler.injectMarket('STOCK-INR');

    expect(result.ordersCreated).toBeGreaterThan(0);
    expect(result.referencePrice).toBeDefined();
  });

  it('should throw error when injecting non-existent market', () => {
    expect(() => {
      scheduler.injectMarket('NON-EXISTENT');
    }).toThrow('Liquidity injector for NON-EXISTENT not found');
  });

  it('should start all markets', () => {
    marketManager.registerMarket(
      new Market({
        marketId: 'TECH-INR',
        baseAsset: 'TECH',
        quoteAsset: 'INR',
        tickSize: 0.01,
        minQuantity: 1,
        maxQuantity: 1000000,
        status: 'ACTIVE',
      })
    );

    scheduler.startAll();

    expect(scheduler.isMarketActive('STOCK-INR')).toBe(true);
    expect(scheduler.isMarketActive('TECH-INR')).toBe(true);
  });

  it('should stop all markets', () => {
    scheduler.startMarket('STOCK-INR');
    scheduler.stopAll();

    expect(scheduler.isMarketActive('STOCK-INR')).toBe(false);
  });
});

