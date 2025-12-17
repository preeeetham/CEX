import { Order } from '../models/Order';
import { Trade } from '../models/Trade';
import { OrderBookSnapshot } from '../models/types';

/**
 * Event types for WebSocket streaming
 */
export enum EventType {
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_CANCELED = 'ORDER_CANCELED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  TRADE_EXECUTED = 'TRADE_EXECUTED',
  ORDERBOOK_UPDATED = 'ORDERBOOK_UPDATED',
}

/**
 * Base event interface
 */
export interface BaseEvent {
  eventType: EventType;
  eventId: string;
  market: string;
  timestamp: number;
}

/**
 * Order placed event
 */
export interface OrderPlacedEvent extends BaseEvent {
  eventType: EventType.ORDER_PLACED;
  payload: {
    order: {
      orderId: string;
      side: string;
      type: string;
      price: number;
      quantity: number;
      remainingQuantity: number;
      status: string;
    };
  };
}

/**
 * Order canceled event
 */
export interface OrderCanceledEvent extends BaseEvent {
  eventType: EventType.ORDER_CANCELED;
  payload: {
    orderId: string;
    canceledQuantity: number;
  };
}

/**
 * Order updated event (fill occurred)
 */
export interface OrderUpdatedEvent extends BaseEvent {
  eventType: EventType.ORDER_UPDATED;
  payload: {
    order: {
      orderId: string;
      status: string;
      remainingQuantity: number;
      filledQuantity: number;
    };
    fill?: {
      tradeId: string;
      price: number;
      quantity: number;
    };
  };
}

/**
 * Trade executed event
 */
export interface TradeExecutedEvent extends BaseEvent {
  eventType: EventType.TRADE_EXECUTED;
  payload: {
    trade: {
      tradeId: string;
      price: number;
      quantity: number;
      takerSide: string;
      timestamp: number;
    };
  };
}

/**
 * Orderbook updated event
 */
export interface OrderbookUpdatedEvent extends BaseEvent {
  eventType: EventType.ORDERBOOK_UPDATED;
  payload: OrderBookSnapshot;
}

export type MarketEvent =
  | OrderPlacedEvent
  | OrderCanceledEvent
  | OrderUpdatedEvent
  | TradeExecutedEvent
  | OrderbookUpdatedEvent;

/**
 * EventPublisher manages WebSocket subscriptions and event broadcasting
 */
export class EventPublisher {
  private subscribers: Map<string, Set<any>> = new Map(); // market -> Set of WebSocket connections
  private userSubscribers: Map<string, Set<any>> = new Map(); // userId -> Set of WebSocket connections
  private readonly randomUUID = () => {
    return require('crypto').randomUUID();
  };

  /**
   * Subscribe to market events
   */
  subscribe(connection: any, market: string): void {
    if (!this.subscribers.has(market)) {
      this.subscribers.set(market, new Set());
    }
    this.subscribers.get(market)!.add(connection);
  }

  /**
   * Unsubscribe from market events
   */
  unsubscribe(connection: any, market: string): void {
    const subscribers = this.subscribers.get(market);
    if (subscribers) {
      subscribers.delete(connection);
      if (subscribers.size === 0) {
        this.subscribers.delete(market);
      }
    }
  }

  /**
   * Subscribe to user-specific events
   */
  subscribeUser(connection: any, userId: string): void {
    if (!this.userSubscribers.has(userId)) {
      this.userSubscribers.set(userId, new Set());
    }
    this.userSubscribers.get(userId)!.add(connection);
  }

  /**
   * Unsubscribe from user events
   */
  unsubscribeUser(connection: any, userId: string): void {
    const subscribers = this.userSubscribers.get(userId);
    if (subscribers) {
      subscribers.delete(connection);
      if (subscribers.size === 0) {
        this.userSubscribers.delete(userId);
      }
    }
  }

  /**
   * Remove connection from all subscriptions
   */
  removeConnection(connection: any): void {
    // Remove from market subscriptions
    for (const [market, subscribers] of this.subscribers.entries()) {
      subscribers.delete(connection);
      if (subscribers.size === 0) {
        this.subscribers.delete(market);
      }
    }

    // Remove from user subscriptions
    for (const [userId, subscribers] of this.userSubscribers.entries()) {
      subscribers.delete(connection);
      if (subscribers.size === 0) {
        this.userSubscribers.delete(userId);
      }
    }
  }

  /**
   * Publish event to market subscribers
   */
  publishMarketEvent(event: MarketEvent): void {
    const subscribers = this.subscribers.get(event.market);
    if (!subscribers) {
      return;
    }

    const message = JSON.stringify(event);
    const deadConnections: any[] = [];

    for (const connection of subscribers) {
      try {
        if (connection.readyState === 1) {
          // WebSocket.OPEN
          connection.send(message);
        } else {
          deadConnections.push(connection);
        }
      } catch (error) {
        deadConnections.push(connection);
      }
    }

    // Clean up dead connections
    for (const dead of deadConnections) {
      subscribers.delete(dead);
    }
  }

  /**
   * Publish event to user subscribers
   */
  publishUserEvent(userId: string, event: MarketEvent): void {
    const subscribers = this.userSubscribers.get(userId);
    if (!subscribers) {
      return;
    }

    const message = JSON.stringify(event);
    const deadConnections: any[] = [];

    for (const connection of subscribers) {
      try {
        if (connection.readyState === 1) {
          // WebSocket.OPEN
          connection.send(message);
        } else {
          deadConnections.push(connection);
        }
      } catch (error) {
        deadConnections.push(connection);
      }
    }

    // Clean up dead connections
    for (const dead of deadConnections) {
      subscribers.delete(dead);
    }
  }

  /**
   * Create order placed event
   */
  createOrderPlacedEvent(market: string, order: Order): OrderPlacedEvent {
    return {
      eventType: EventType.ORDER_PLACED,
      eventId: this.randomUUID(),
      market,
      timestamp: Date.now(),
      payload: {
        order: {
          orderId: order.orderId,
          side: order.side,
          type: order.type,
          price: order.price,
          quantity: order.quantity,
          remainingQuantity: order.remainingQuantity,
          status: order.status,
        },
      },
    };
  }

  /**
   * Create order canceled event
   */
  createOrderCanceledEvent(market: string, orderId: string, canceledQuantity: number): OrderCanceledEvent {
    return {
      eventType: EventType.ORDER_CANCELED,
      eventId: this.randomUUID(),
      market,
      timestamp: Date.now(),
      payload: {
        orderId,
        canceledQuantity,
      },
    };
  }

  /**
   * Create order updated event
   */
  createOrderUpdatedEvent(market: string, order: Order, fill?: { tradeId: string; price: number; quantity: number }): OrderUpdatedEvent {
    return {
      eventType: EventType.ORDER_UPDATED,
      eventId: this.randomUUID(),
      market,
      timestamp: Date.now(),
      payload: {
        order: {
          orderId: order.orderId,
          status: order.status,
          remainingQuantity: order.remainingQuantity,
          filledQuantity: order.filledQuantity,
        },
        fill,
      },
    };
  }

  /**
   * Create trade executed event
   */
  createTradeExecutedEvent(market: string, trade: Trade): TradeExecutedEvent {
    return {
      eventType: EventType.TRADE_EXECUTED,
      eventId: this.randomUUID(),
      market,
      timestamp: Date.now(),
      payload: {
        trade: {
          tradeId: trade.tradeId,
          price: trade.price,
          quantity: trade.quantity,
          takerSide: trade.takerSide,
          timestamp: trade.timestamp,
        },
      },
    };
  }

  /**
   * Create orderbook updated event
   */
  createOrderbookUpdatedEvent(market: string, snapshot: OrderBookSnapshot): OrderbookUpdatedEvent {
    return {
      eventType: EventType.ORDERBOOK_UPDATED,
      eventId: this.randomUUID(),
      market,
      timestamp: Date.now(),
      payload: snapshot,
    };
  }
}

