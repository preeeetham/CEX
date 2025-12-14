/**
 * Core type definitions for the CEX trading engine
 */

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  LIMIT = 'LIMIT',
  MARKET = 'MARKET',
}

export enum OrderStatus {
  NEW = 'NEW',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELED = 'CANCELED',
  REJECTED = 'REJECTED',
}

export enum OrderOwner {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}

export interface Order {
  orderId: string;
  market: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  quantity: number;
  remainingQuantity: number;
  filledQuantity: number;
  owner: OrderOwner;
  ownerId: string;
  status: OrderStatus;
  timestamp: number;
  lastUpdateTime: number;
}

export interface Trade {
  tradeId: string;
  market: string;
  price: number;
  quantity: number;
  takerOrderId: string;
  makerOrderId: string;
  takerSide: OrderSide;
  timestamp: number;
  isBuyerMaker: boolean;
}

export interface Market {
  marketId: string;
  baseAsset: string;
  quoteAsset: string;
  tickSize: number;
  minQuantity: number;
  maxQuantity: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface OrderBookSnapshot {
  market: string;
  timestamp: number;
  bids: [string, string][]; // [price, quantity]
  asks: [string, string][]; // [price, quantity]
  lastTradePrice?: number;
  lastTradeTime?: number;
  spread?: number;
  midPrice?: number;
}

export interface Fill {
  tradeId: string;
  price: number;
  quantity: number;
  timestamp: number;
}

