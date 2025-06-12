// server.ts
import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

export const TICKER = "GOOGLE";

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

app.post("/order", (req, res) => {
  const { side, price, quantity, userId } = req.body;

  const user = users.find((u) => u.id === userId);
  if (!user) return res.status(400).json({ error: "User not found" });

  if (side === "bid" && user.balances["USD"] < price * quantity) {
    return res.status(400).json({ error: "Insufficient USD" });
  }

  if (side === "ask" && user.balances[TICKER] < quantity) {
    return res.status(400).json({ error: `Insufficient ${TICKER}` });
  }

  const filled = fillOrders(side, price, quantity, userId);

  if (filled.remainingQuantity > 0) {
    const bookOrder = { userId, price, quantity: filled.remainingQuantity };
    if (side === "bid") {
      bids.push(bookOrder);
      bids.sort((a, b) => b.price - a.price); // high to low
    } else {
      asks.push(bookOrder);
      asks.sort((a, b) => a.price - b.price); // low to high
    }
  }

  return res.json({ filledQuantity: quantity - filled.remainingQuantity });
});

function fillOrders(
  side: string,
  price: number,
  quantity: number,
  userId: string
) {
  let remainingQuantity = quantity;
  const book = side === "bid" ? asks : bids;
  const comparator = side === "bid" ? (p: number) => p <= price : (p: number) => p >= price;

  for (let i = 0; i < book.length && remainingQuantity > 0; ) {
    if (!comparator(book[i].price)) {
      break;
    }

    const match = book[i];
    const tradeQty = Math.min(remainingQuantity, match.quantity);
    const tradePrice = match.price;

    if (side === "bid") {
      flipBalance(match.userId, userId, tradeQty, tradePrice);
    } else {
      flipBalance(userId, match.userId, tradeQty, tradePrice);
    }

    match.quantity -= tradeQty;
    remainingQuantity -= tradeQty;

    if (match.quantity === 0) {
      book.splice(i, 1); // remove order
    } else {
      i++;
    }
  }

  return { remainingQuantity };
}

function flipBalance(sellerId: string, buyerId: string, qty: number, price: number) {
  const seller = users.find((u) => u.id === sellerId);
  const buyer = users.find((u) => u.id === buyerId);
  if (!seller || !buyer) return;

  seller.balances[TICKER] -= qty;
  buyer.balances[TICKER] += qty;

  seller.balances.USD += qty * price;
  buyer.balances.USD -= qty * price;
}

app.get("/depth", (_, res) => {
  const depth = {
    bids: [...bids],
    asks: [...asks],
  };
  res.json(depth);
});

app.get("/balance/:userId", (req, res) => {
  const user = users.find((u) => u.id === req.params.userId);
  if (!user) {
    return res.json({
      USD: 0,
      [TICKER]: 0,
    });
  }
  res.json(user.balances);
});

app.listen(3000, () => console.log("Orderbook server running on port 3000"));
