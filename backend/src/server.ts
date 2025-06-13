import express, { Request, Response } from "express";
import bodyParser from "body-parser";

export const app = express();
const PORT = 3000;

app.use(bodyParser.json());

interface Balances {
  [key: string]: number;
}

interface User {
  id: string;
  balances: Balances;
}

interface Order {
  userId: string;
  price: number;
  quantity: number;
}

export const TICKER = "GOOGLE";

const users: User[] = [
  {
    id: "1",
    balances: {
      [TICKER]: 10,
      USD: 50000,
    },
  },
  {
    id: "2",
    balances: {
      [TICKER]: 10,
      USD: 50000,
    },
  },
];

const bids: Order[] = [];
const asks: Order[] = [];

// Place a limit order
app.post("/order", (req: Request, res: Response) => {
  const { side, price, quantity, userId } = req.body;

  if (!side || !price || !quantity || !userId) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const remainingQty = fillOrders(side, price, quantity, userId);

  if (remainingQty === 0) {
    return res.json({ filledQuantity: quantity });
  }

  const order: Order = { userId, price, quantity: remainingQty };

  if (side === "bid") {
    bids.push(order);
    bids.sort((a, b) => b.price - a.price); // Highest bid first
  } else {
    asks.push(order);
    asks.sort((a, b) => a.price - b.price); // Lowest ask first
  }

  res.json({ filledQuantity: quantity - remainingQty });
});

// Order book depth
app.get("/depth", (_req: Request, res: Response) => {
  const depth: {
    [price: string]: {
      type: "bid" | "ask";
      quantity: number;
    };
  } = {};

  for (const bid of bids) {
    if (!depth[bid.price]) {
      depth[bid.price] = { type: "bid", quantity: bid.quantity };
    } else {
      depth[bid.price].quantity += bid.quantity;
    }
  }

  for (const ask of asks) {
    if (!depth[ask.price]) {
      depth[ask.price] = { type: "ask", quantity: ask.quantity };
    } else {
      depth[ask.price].quantity += ask.quantity;
    }
  }

  res.json({ depth });
});

// User balance
app.get("/balance/:userId", (req: Request, res: Response) => {
  const user = users.find(u => u.id === req.params.userId);

  if (!user) {
    return res.json({
      USD: 0,
      [TICKER]: 0,
    });
  }

  res.json({ balances: user.balances });
});

// Quote endpoint (left as TODO in your original code)
app.get("/quote", (_req: Request, res: Response) => {
  if (asks.length === 0 || bids.length === 0) {
    return res.json({ message: "Not enough market data" });
  }

  const bestBid = bids[0].price;
  const bestAsk = asks[0].price;
  const mid = (bestBid + bestAsk) / 2;

  res.json({ bestBid, bestAsk, mid });
});

// Balance adjustment on match
function flipBalance(sellerId: string, buyerId: string, qty: number, price: number) {
  const seller = users.find(u => u.id === sellerId);
  const buyer = users.find(u => u.id === buyerId);
  if (!seller || !buyer) return;

  seller.balances[TICKER] = (seller.balances[TICKER] || 0) - qty;
  buyer.balances[TICKER] = (buyer.balances[TICKER] || 0) + qty;

  seller.balances.USD = (seller.balances.USD || 0) + qty * price;
  buyer.balances.USD = (buyer.balances.USD || 0) - qty * price;
}

// Fill orders
function fillOrders(
  side: string,
  price: number,
  quantity: number,
  userId: string
): number {
  let remainingQty = quantity;

  if (side === "bid") {
    for (let i = 0; i < asks.length && remainingQty > 0; ) {
      const ask = asks[i];
      if (ask.price > price) break;

      const tradeQty = Math.min(ask.quantity, remainingQty);
      flipBalance(ask.userId, userId, tradeQty, ask.price);
      remainingQty -= tradeQty;

      if (ask.quantity > tradeQty) {
        ask.quantity -= tradeQty;
        i++;
      } else {
        asks.splice(i, 1);
      }
    }
  } else {
    for (let i = 0; i < bids.length && remainingQty > 0; ) {
      const bid = bids[i];
      if (bid.price < price) break;

      const tradeQty = Math.min(bid.quantity, remainingQty);
      flipBalance(userId, bid.userId, tradeQty, bid.price);
      remainingQty -= tradeQty;

      if (bid.quantity > tradeQty) {
        bid.quantity -= tradeQty;
        i++;
      } else {
        bids.splice(i, 1);
      }
    }
  }

  return remainingQty;
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
