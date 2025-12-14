import { Trade as ITrade, OrderSide } from './types';
import { randomUUID } from 'crypto';

/**
 * Trade class representing an executed trade
 */
export class Trade implements ITrade {
  tradeId: string;
  market: string;
  price: number;
  quantity: number;
  takerOrderId: string;
  makerOrderId: string;
  takerSide: OrderSide;
  timestamp: number;
  isBuyerMaker: boolean;

  constructor(params: {
    market: string;
    price: number;
    quantity: number;
    takerOrderId: string;
    makerOrderId: string;
    takerSide: OrderSide;
    timestamp?: number;
  }) {
    this.tradeId = randomUUID();
    this.market = params.market;
    this.price = params.price;
    this.quantity = params.quantity;
    this.takerOrderId = params.takerOrderId;
    this.makerOrderId = params.makerOrderId;
    this.takerSide = params.takerSide;
    this.timestamp = params.timestamp || Date.now();
    this.isBuyerMaker = params.takerSide === OrderSide.SELL;
  }

  /**
   * Convert to plain object
   */
  toJSON(): ITrade {
    return {
      tradeId: this.tradeId,
      market: this.market,
      price: this.price,
      quantity: this.quantity,
      takerOrderId: this.takerOrderId,
      makerOrderId: this.makerOrderId,
      takerSide: this.takerSide,
      timestamp: this.timestamp,
      isBuyerMaker: this.isBuyerMaker,
    };
  }
}

