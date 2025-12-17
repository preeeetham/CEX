import { FastifyInstance } from 'fastify';
import { MarketManager } from '../services/MarketManager';
import { EventPublisher } from '../services/EventPublisher';

/**
 * WebSocket message types
 */
interface SubscribeMessage {
  type: 'subscribe';
  channels: Array<{
    name: string;
    market?: string;
    depth?: number;
  }>;
  userId?: string;
}

interface UnsubscribeMessage {
  type: 'unsubscribe';
  channels: string[];
}

type WebSocketMessage = SubscribeMessage | UnsubscribeMessage;

/**
 * Register WebSocket routes
 */
export async function registerWebSocketRoutes(server: FastifyInstance, marketManager: MarketManager, eventPublisher: EventPublisher): Promise<void> {
  await server.register(require('@fastify/websocket'));

  server.get('/ws', { websocket: true } as any, (socket: any) => {
    const subscriptions: Map<string, Set<string>> = new Map(); // channel -> Set of markets
    let userId: string | undefined;

    // Send welcome message immediately (socket is already open when handler is called)
    try {
      socket.send(
        JSON.stringify({
          type: 'connected',
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      // Connection might be closed, ignore
    }

    socket.on('message', (message: Buffer) => {
      try {
        const data: WebSocketMessage = JSON.parse(message.toString());

        if (data.type === 'subscribe') {
          handleSubscribe(data, socket, subscriptions, marketManager, eventPublisher);
          if (data.userId) {
            userId = data.userId;
            eventPublisher.subscribeUser(socket, userId);
          }
        } else if (data.type === 'unsubscribe') {
          handleUnsubscribe(data, socket, subscriptions, eventPublisher);
        }
      } catch (error) {
        socket.send(
          JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          })
        );
      }
    });

    socket.on('close', () => {
      // Clean up all subscriptions
      for (const [channel, markets] of subscriptions.entries()) {
        for (const market of markets) {
          if (channel === 'orderbook' || channel === 'trades') {
            eventPublisher.unsubscribe(socket, market);
          }
        }
      }

      if (userId) {
        eventPublisher.unsubscribeUser(socket, userId);
      }

      subscriptions.clear();
    });
  });
}

/**
 * Handle subscription
 */
function handleSubscribe(
  message: SubscribeMessage,
  socket: any,
  subscriptions: Map<string, Set<string>>,
  marketManager: MarketManager,
  eventPublisher: EventPublisher
): void {
  for (const channel of message.channels) {
    if (!subscriptions.has(channel.name)) {
      subscriptions.set(channel.name, new Set());
    }

    if (channel.name === 'orderbook' || channel.name === 'trades') {
      if (!channel.market) {
        try {
          socket.send(
            JSON.stringify({
              type: 'error',
              message: `Market is required for ${channel.name} channel`,
            })
          );
        } catch (e) {
          // Connection closed
        }
        continue;
      }

      const market = marketManager.getMarket(channel.market);
      if (!market) {
        try {
          socket.send(
            JSON.stringify({
              type: 'error',
              message: `Market ${channel.market} does not exist`,
            })
          );
        } catch (e) {
          // Connection closed
        }
        continue;
      }

      eventPublisher.subscribe(socket, channel.market);
      subscriptions.get(channel.name)!.add(channel.market);

      // Send initial snapshot for orderbook
      if (channel.name === 'orderbook') {
        const engine = marketManager.getEngine(channel.market);
        if (engine) {
          const depth = channel.depth || 10;
          const snapshot = engine.getOrderBook().getSnapshot(depth);
          const event = eventPublisher.createOrderbookUpdatedEvent(channel.market, snapshot);
          try {
            socket.send(JSON.stringify(event));
          } catch (e) {
            // Connection closed
          }
        }
      }
    } else if (channel.name === 'user.orders') {
      // User orders channel doesn't need market
      // Already handled via userId subscription
    }

    try {
      socket.send(
        JSON.stringify({
          type: 'subscribed',
          channel: channel.name,
          market: channel.market,
        })
      );
    } catch (e) {
      // Connection closed
    }
  }
}

/**
 * Handle unsubscription
 */
function handleUnsubscribe(
  message: UnsubscribeMessage,
  socket: any,
  subscriptions: Map<string, Set<string>>,
  eventPublisher: EventPublisher
): void {
  for (const channelName of message.channels) {
    const markets = subscriptions.get(channelName);
    if (markets) {
      for (const market of markets) {
        if (channelName === 'orderbook' || channelName === 'trades') {
          eventPublisher.unsubscribe(socket, market);
        }
      }
      subscriptions.delete(channelName);
    }

    socket.send(
      JSON.stringify({
        type: 'unsubscribed',
        channel: channelName,
      })
    );
  }
}

