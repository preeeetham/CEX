# API Usage Guide

## Starting the Server

```bash
cd backend
npm run build
npm start
```

Or in development mode:
```bash
npm run dev  # if you have nodemon/ts-node setup
```

Server will start on `http://localhost:3000` by default.

---

## Placing Orders

### Format
The API uses JSON format, not the command-line style "buy CRY 100 @ 82.54".

### Place a Limit Buy Order

```bash
curl -X POST http://localhost:3000/api/v1/order \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "market": "STOCK-INR",
    "side": "BUY",
    "type": "LIMIT",
    "price": 82.54,
    "quantity": 100
  }'
```

### Place a Limit Sell Order

```bash
curl -X POST http://localhost:3000/api/v1/order \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "market": "STOCK-INR",
    "side": "SELL",
    "type": "LIMIT",
    "price": 82.54,
    "quantity": 100
  }'
```

### Place a Market Order (no price needed)

```bash
curl -X POST http://localhost:3000/api/v1/order \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "market": "STOCK-INR",
    "side": "BUY",
    "type": "MARKET",
    "quantity": 100
  }'
```

---

## Checking Order Status

### Get Order by ID

```bash
curl http://localhost:3000/api/v1/order/{orderId} \
  -H "x-user-id: user123"
```

### Get All Your Orders

```bash
curl http://localhost:3000/api/v1/orders \
  -H "x-user-id: user123"
```

### Get Orders by Market

```bash
curl "http://localhost:3000/api/v1/orders?market=STOCK-INR" \
  -H "x-user-id: user123"
```

---

## Canceling Orders

```bash
curl -X DELETE http://localhost:3000/api/v1/order/{orderId} \
  -H "x-user-id: user123"
```

---

## Market Data

### Get Order Book

```bash
curl "http://localhost:3000/api/v1/orderbook?market=STOCK-INR&depth=10"
```

### Get Trade History

```bash
curl "http://localhost:3000/api/v1/trades?market=STOCK-INR&limit=50"
```

### Get Market Stats

```bash
curl http://localhost:3000/api/v1/market/stats?market=STOCK-INR
```

---

## Liquidity Injection (Internal API)

### Manual Injection

```bash
curl -X POST http://localhost:3000/internal/liquidity/inject \
  -H "Content-Type: application/json" \
  -d '{
    "market": "STOCK-INR",
    "action": "refresh"
  }'
```

### Check Injection Status

```bash
curl http://localhost:3000/internal/liquidity/status
```

---

## WebSocket Connection

Connect to WebSocket for real-time updates:

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  // Subscribe to orderbook
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: [
      {
        name: 'orderbook',
        market: 'STOCK-INR',
        depth: 10
      }
    ]
  }));
});

ws.on('message', (data) => {
  console.log('Received:', JSON.parse(data.toString()));
});
```

---

## Example: Complete Trading Flow

```bash
# 1. Check order book
curl "http://localhost:3000/api/v1/orderbook?market=STOCK-INR&depth=5"

# 2. Place a buy order
ORDER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/order \
  -H "Content-Type: application/json" \
  -H "x-user-id: trader1" \
  -d '{
    "market": "STOCK-INR",
    "side": "BUY",
    "type": "LIMIT",
    "price": 82.50,
    "quantity": 50
  }')

# Extract order ID (requires jq)
ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.orderId')
echo "Order ID: $ORDER_ID"

# 3. Check order status
curl http://localhost:3000/api/v1/order/$ORDER_ID \
  -H "x-user-id: trader1"

# 4. Cancel the order
curl -X DELETE http://localhost:3000/api/v1/order/$ORDER_ID \
  -H "x-user-id: trader1"
```

---

## Available Markets

- `STOCK-INR`
- `TECH-INR`
- `BOND-INR`

---

## Notes

- **User ID**: Use `x-user-id` header to identify yourself (required for order operations)
- **Price**: Must be a multiple of tick size (0.01 for all markets)
- **Quantity**: Must be between minQuantity (1) and maxQuantity (1000000)
- **Market Orders**: Execute immediately at best available price
- **Limit Orders**: Wait in order book until matched

