import { Order } from '../models/Order';
import { OrderType } from '../models/types';
import { Market } from '../models/Market';
import { z } from 'zod';

/**
 * Validation schemas using Zod
 */
export const PlaceOrderSchema = z.object({
  market: z.string().min(1),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['LIMIT', 'MARKET']),
  price: z.number().positive().optional(),
  quantity: z.number().int().positive(),
});

/**
 * Validate an order against market rules
 */
export function validateOrder(order: Order, market: Market): { valid: boolean; error?: string } {
  // Check if market is active
  if (!market.isActive()) {
    return { valid: false, error: 'Market is not active' };
  }

  // Validate quantity
  if (order.quantity < market.minQuantity) {
    return {
      valid: false,
      error: `Quantity must be at least ${market.minQuantity}`,
    };
  }

  if (order.quantity > market.maxQuantity) {
    return {
      valid: false,
      error: `Quantity must be at most ${market.maxQuantity}`,
    };
  }

  // For limit orders, validate price
  if (order.type === OrderType.LIMIT) {
    if (order.price <= 0) {
      return { valid: false, error: 'Price must be positive' };
    }

    // Validate tick size - use rounding approach to avoid floating point issues
    const roundedPrice = roundToTick(order.price, market.tickSize);
    const difference = Math.abs(order.price - roundedPrice);
    if (difference > 0.0001) {
      // Account for floating point precision
      return {
        valid: false,
        error: `Price must be a multiple of tick size ${market.tickSize}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate price respects tick size
 */
export function validatePrice(price: number, tickSize: number): boolean {
  const remainder = price % tickSize;
  return Math.abs(remainder) < 0.0001; // Account for floating point precision
}

/**
 * Round price to nearest tick
 */
export function roundToTick(price: number, tickSize: number): number {
  return Math.round(price / tickSize) * tickSize;
}

