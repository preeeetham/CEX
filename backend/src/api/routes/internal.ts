import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { LiquidityScheduler } from '../../services/LiquidityScheduler';

/**
 * Register internal API routes (for system operations)
 */
export async function registerInternalRoutes(
  server: FastifyInstance,
  liquidityScheduler: LiquidityScheduler
): Promise<void> {
  /**
   * POST /internal/liquidity/inject - Manually trigger liquidity injection
   */
  server.post(
    '/internal/liquidity/inject',
    {
      schema: {
        body: {
          type: 'object',
          required: ['market'],
          properties: {
            market: { type: 'string' },
            action: { type: 'string', enum: ['refresh', 'start', 'stop'] },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Body: { market: string; action?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { market, action = 'refresh' } = request.body;

      try {
        if (action === 'refresh') {
          // Manual injection trigger
          const result = liquidityScheduler.injectMarket(market);
          return reply.status(200).send({
            market,
            ordersCreated: result.ordersCreated,
            ordersCanceled: result.ordersCanceled,
            referencePrice: result.referencePrice,
            timestamp: Date.now(),
          });
        } else if (action === 'start') {
          liquidityScheduler.startMarket(market);
          return reply.status(200).send({
            market,
            status: 'started',
            timestamp: Date.now(),
          });
        } else if (action === 'stop') {
          liquidityScheduler.stopMarket(market);
          return reply.status(200).send({
            market,
            status: 'stopped',
            timestamp: Date.now(),
          });
        }
      } catch (error: any) {
        return reply.status(400).send({
          error: {
            code: 'INJECTION_FAILED',
            message: error.message || 'Failed to inject liquidity',
            timestamp: Date.now(),
          },
        });
      }
    }
  );

  /**
   * GET /internal/liquidity/status - Get liquidity injection status
   */
  server.get('/internal/liquidity/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const markets = server.marketManager.getAllMarkets();
    const status = markets.map((market) => ({
      market: market.marketId,
      active: liquidityScheduler.isMarketActive(market.marketId),
      injector: liquidityScheduler.getInjector(market.marketId)
        ? {
            referencePrice: liquidityScheduler.getInjector(market.marketId)!.getReferencePrice(),
            config: liquidityScheduler.getInjector(market.marketId)!.getConfig(),
          }
        : null,
    }));

    return reply.status(200).send({
      enabled: liquidityScheduler.isEnabled(),
      markets: status,
      timestamp: Date.now(),
    });
  });
}

