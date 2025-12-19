# Quick Start Guide

## 🚀 Start the Server

```bash
cd backend
npm run build
npm start
```

The server will start on `http://localhost:3000`

---

## 📝 Place an Order (Your Example: "buy CRY 100 @ 82.54")

The API uses JSON format. Here's how to translate your command:

**Your command:** `buy CRY 100 @ 82.54`
- **Side:** BUY
- **Market:** STOCK-INR (or TECH-INR, BOND-INR)
- **Quantity:** 100
- **Price:** 82.54
- **Type:** LIMIT

**API Call:**

```bash
curl -X POST http://localhost:3000/api/v1/order \
  -H "Content-Type: application/json" \
  -H "x-user-id: trader1" \
  -d '{
    "market": "STOCK-INR",
    "side": "BUY",
    "type": "LIMIT",
    "price": 82.54,
    "quantity": 100
  }'
```

---

## 🧪 Quick Test Script

Run the automated test script:

```bash
cd backend
./test-trading.sh
```

This will:
1. Check server health
2. View order book
3. Place buy and sell orders
4. Check order status
5. Cancel orders
6. View trades and stats

**Note:** Requires `jq` for JSON formatting. Install with:
- macOS: `brew install jq`
- Linux: `sudo apt-get install jq`

---

## 📋 Common Commands

### 1. Place a Buy Order
```bash
curl -X POST http://localhost:3000/api/v1/order \
  -H "Content-Type: application/json" \
  -H "x-user-id: trader1" \
  -d '{"market": "STOCK-INR", "side": "BUY", "type": "LIMIT", "price": 82.50, "quantity": 100}'
```

### 2. Place a Sell Order
```bash
curl -X POST http://localhost:3000/api/v1/order \
  -H "Content-Type: application/json" \
  -H "x-user-id: trader1" \
  -d '{"market": "STOCK-INR", "side": "SELL", "type": "LIMIT", "price": 82.60, "quantity": 50}'
```

### 3. View Order Book
```bash
curl "http://localhost:3000/api/v1/orderbook?market=STOCK-INR&depth=10"
```

### 4. Get Your Orders
```bash
curl http://localhost:3000/api/v1/orders -H "x-user-id: trader1"
```

### 5. Cancel an Order
```bash
curl -X DELETE http://localhost:3000/api/v1/order/{ORDER_ID} -H "x-user-id: trader1"
```

---

## 📊 Available Markets

- `STOCK-INR` - Stock market
- `TECH-INR` - Tech market  
- `BOND-INR` - Bond market

---

## ⚙️ Order Types

### LIMIT Order
- Requires `price` field
- Waits in order book until matched
- Example: Buy 100 shares at 82.54

### MARKET Order
- No `price` field needed
- Executes immediately at best available price
- Example: Buy 100 shares at market price

---

## 🔑 Important Notes

1. **User ID**: Always include `x-user-id` header (any string works)
2. **Price**: Must be multiple of 0.01 (tick size)
3. **Quantity**: Must be between 1 and 1,000,000
4. **Market**: Use one of the available markets (STOCK-INR, TECH-INR, BOND-INR)

---

## 💧 Liquidity Injection

The system automatically injects liquidity every 5 seconds. You can also manually trigger:

```bash
curl -X POST http://localhost:3000/internal/liquidity/inject \
  -H "Content-Type: application/json" \
  -d '{"market": "STOCK-INR", "action": "refresh"}'
```

---

## 📖 Full Documentation

See `API_USAGE.md` for complete API documentation.

