import { Market as IMarket } from './types';

/**
 * Market class representing a trading pair
 */
export class Market implements IMarket {
  marketId: string;
  baseAsset: string;
  quoteAsset: string;
  tickSize: number;
  minQuantity: number;
  maxQuantity: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

  constructor(params: {
    marketId: string;
    baseAsset: string;
    quoteAsset: string;
    tickSize?: number;
    minQuantity?: number;
    maxQuantity?: number;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  }) {
    this.marketId = params.marketId;
    this.baseAsset = params.baseAsset;
    this.quoteAsset = params.quoteAsset;
    this.tickSize = params.tickSize ?? 0.01;
    this.minQuantity = params.minQuantity ?? 1;
    this.maxQuantity = params.maxQuantity ?? 1000000;
    this.status = params.status ?? 'ACTIVE';
  }

  /**
   * Check if market is active for trading
   */
  isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  /**
   * Convert to plain object
   */
  toJSON(): IMarket {
    return {
      marketId: this.marketId,
      baseAsset: this.baseAsset,
      quoteAsset: this.quoteAsset,
      tickSize: this.tickSize,
      minQuantity: this.minQuantity,
      maxQuantity: this.maxQuantity,
      status: this.status,
    };
  }
}

