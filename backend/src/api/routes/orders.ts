import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Order } from '../../models/Order';
import { OrderSide, OrderType, OrderOwner } from '../../models/types';
import { validateOrder } from '../../utils/validator';

/**
 * Register order-related routes
 */
export async function registerOrderRoutes(server: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/order - Place a new order
   */
  server.post(
    '/api/v1/order',
    {
      schema: {
        body: {
          type: 'object',
          required: ['market', 'side', 'type', 'quantity'],
          properties: {
            market: { type: 'string', minLength: 1 },
            side: { type: 'string', enum: ['BUY', 'SELL'] },
            type: { type: 'string', enum: ['LIMIT', 'MARKET'] },
            price: { type: 'number', minimum: 0 },
            quantity: { type: 'integer', minimum: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { market: string; side: string; type: string; price?: number; quantity: number } }>, reply: FastifyReply) => {
      const { market, side, type, price, quantity } = request.body;
      const marketManager = server.marketManager;

      // Get market
      const marketConfig = marketManager.getMarket(market);
      if (!marketConfig) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_MARKET',
            message: `Market ${market} does not exist`,
            timestamp: Date.now(),
          },
        });
      }

      // Validate price for limit orders
      if (type === 'LIMIT' && (!price || price <= 0)) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_PRICE',
            message: 'Price is required for limit orders and must be positive',
            field: 'price',
            timestamp: Date.now(),
          },
        });
      }

      // Create order
      const order = new Order({
        market,
        side: side as OrderSide,
        type: type as OrderType,
        price: price || 0, // Will be ignored for market orders
        quantity,
        owner: OrderOwner.USER,
        ownerId: (request.headers['x-user-id'] as string) || 'anonymous',
      });

      // Validate order
      const validation = validateOrder(order, marketConfig);
      if (!validation.valid) {
        return reply.status(422).send({
          error: {
            code: 'VALIDATION_FAILED',
            message: validation.error,
            timestamp: Date.now(),
          },
        });
      }

      // Get matching engine
      const engine = marketManager.getEngine(market);
      if (!engine) {
        return reply.status(503).send({
          error: {
            code: 'MARKET_UNAVAILABLE',
            message: `Market ${market} is temporarily unavailable`,
            timestamp: Date.now(),
          },
        });
      }

      // Process order
      const result = engine.processOrder(order);
      const fills = result.trades.map((trade) => ({
        tradeId: trade.tradeId,
        price: trade.price,
        quantity: trade.quantity,
        timestamp: trade.timestamp,
      }));

      // Publish events
      const eventPublisher = server.eventPublisher;

      // Publish trade events
      for (const trade of result.trades) {
        eventPublisher.publishMarketEvent(eventPublisher.createTradeExecutedEvent(market, trade));
      }

      // Publish order placed event
      if (order.status === 'NEW' || order.status === 'PARTIALLY_FILLED') {
        eventPublisher.publishMarketEvent(eventPublisher.createOrderPlacedEvent(market, order));
        
        // Publish orderbook update
        const snapshot = engine.getOrderBook().getSnapshot(10);
        eventPublisher.publishMarketEvent(eventPublisher.createOrderbookUpdatedEvent(market, snapshot));
      }

      // Publish user order update if filled
      if (order.status === 'FILLED' || order.status === 'PARTIALLY_FILLED') {
        const fill = fills.length > 0 ? fills[0] : undefined;
        const updateEvent = eventPublisher.createOrderUpdatedEvent(
          market,
          order,
          fill ? { tradeId: fill.tradeId, price: fill.price, quantity: fill.quantity } : undefined
        );
        eventPublisher.publishUserEvent(order.ownerId, updateEvent);
      } else {
        // Publish order placed to user
        eventPublisher.publishUserEvent(order.ownerId, eventPublisher.createOrderPlacedEvent(market, order));
      }

      // Return order with fills
      return reply.status(201).send({
        ...order.toJSON(),
        fills,
      });
    }
  );

  /**
   * DELETE /api/v1/order/:orderId - Cancel an order
   */
  server.delete(
    '/api/v1/order/:orderId',
    async (request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
      const { orderId } = request.params;
      const marketManager = server.marketManager;

      // Try to find and cancel order in all markets
      let canceled = false;
      let canceledOrder: Order | null = null;

      for (const market of marketManager.getAllMarkets()) {
        const engine = marketManager.getEngine(market.marketId);
        if (engine) {
          const order = engine.getOrderBook().getOrder(orderId);
          if (order) {
            canceled = engine.cancelOrder(orderId);
            if (canceled) {
              canceledOrder = order;
              break;
            }
          }
        }
      }

      if (!canceled || !canceledOrder) {
        return reply.status(404).send({
          error: {
            code: 'ORDER_NOT_FOUND',
            message: `Order ${orderId} does not exist`,
            timestamp: Date.now(),
          },
        });
      }

      // Publish events
      const eventPublisher = server.eventPublisher;
      const cancelEvent = eventPublisher.createOrderCanceledEvent(
        canceledOrder.market,
        canceledOrder.orderId,
        canceledOrder.remainingQuantity
      );
      eventPublisher.publishMarketEvent(cancelEvent);
      eventPublisher.publishUserEvent(canceledOrder.ownerId, cancelEvent);

      // Publish orderbook update
      const engine = marketManager.getEngine(canceledOrder.market);
      if (engine) {
        const snapshot = engine.getOrderBook().getSnapshot(10);
        eventPublisher.publishMarketEvent(eventPublisher.createOrderbookUpdatedEvent(canceledOrder.market, snapshot));
      }

      return reply.status(200).send({
        orderId: canceledOrder.orderId,
        status: canceledOrder.status,
        canceledQuantity: canceledOrder.remainingQuantity,
        timestamp: Date.now(),
      });
    }
  );

  /**
   * GET /api/v1/order/:orderId - Get order status
   */
  server.get(
    '/api/v1/order/:orderId',
    async (request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
      const { orderId } = request.params;
      const marketManager = server.marketManager;

      // Try to find order in all markets
      let order: Order | undefined;

      for (const market of marketManager.getAllMarkets()) {
        const engine = marketManager.getEngine(market.marketId);
        if (engine) {
          order = engine.getOrderBook().getOrder(orderId);
          if (order) {
            break;
          }
        }
      }

      if (!order) {
        return reply.status(404).send({
          error: {
            code: 'ORDER_NOT_FOUND',
            message: `Order ${orderId} does not exist`,
            timestamp: Date.now(),
          },
        });
      }

      return reply.status(200).send(order.toJSON());
    }
  );

  /**
   * GET /api/v1/orders - Get user orders
   */
  server.get(
    '/api/v1/orders',
    async (
      request: FastifyRequest<{
        Querystring: { market?: string; status?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { market, status } = request.query;
      const userId = (request.headers['x-user-id'] as string) || 'anonymous';
      const marketManager = server.marketManager;

      const allOrders: Order[] = [];

      // Get orders from specified market or all markets
      const markets = market ? [marketManager.getMarket(market)].filter(Boolean) : marketManager.getAllMarkets();

      for (const marketConfig of markets) {
        if (!marketConfig) continue;

        const engine = marketManager.getEngine(marketConfig.marketId);
        if (!engine) continue;

        const orders = engine.getOrderBook().getOrdersBySide(OrderSide.BUY);
        const sellOrders = engine.getOrderBook().getOrdersBySide(OrderSide.SELL);
        allOrders.push(...orders, ...sellOrders);
      }

      // Filter by user
      let userOrders = allOrders.filter((order) => order.ownerId === userId);

      // Filter by status if provided
      if (status) {
        userOrders = userOrders.filter((order) => order.status === status);
      }

      return reply.status(200).send({
        orders: userOrders.map((order) => order.toJSON()),
      });
    }
  );
}
