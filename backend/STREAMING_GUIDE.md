# Market Streaming Guide

## 🌐 Browser-Based Market Stream

A real-time market streaming interface is available in your browser!

### How to Access

1. **Start the server:**
   ```bash
   cd backend
   npm run build
   npm start
   ```

2. **Open your browser:**
   Navigate to: `http://localhost:3000`

3. **Connect to a market:**
   - Select a market from the dropdown (STOCK-INR, TECH-INR, or BOND-INR)
   - Click "Connect"
   - Watch the order book update in real-time!

### Features

- **Real-time Order Book**: See bids and asks updating live
- **Market Stats**: Last trade price, best bid/ask, spread, mid price
- **Raw JSON View**: See the exact data being streamed
- **Multiple Markets**: Switch between markets easily
- **Visual Design**: Dark theme with color-coded bids (green) and asks (red)

### What You'll See

1. **Bids (Buy Orders)** - Green, on the left
   - Shows all buy orders waiting to be filled
   - Highest bid price at the top

2. **Asks (Sell Orders)** - Red, on the right
   - Shows all sell orders waiting to be filled
   - Lowest ask price at the top

3. **Market Info Cards**:
   - Last Trade Price: Most recent trade execution price
   - Best Bid: Highest buy order price
   - Best Ask: Lowest sell order price
   - Spread: Difference between best ask and best bid
   - Mid Price: Average of best bid and ask

4. **Raw JSON**: The exact WebSocket message format

### How It Works

- Connects to WebSocket at `ws://localhost:3000/ws`
- Subscribes to `orderbook` channel for selected market
- Receives updates whenever:
  - New orders are placed
  - Orders are canceled
  - Trades are executed
  - Liquidity injection updates the book

### Understanding the Data

**Order Book Format:**
```json
{
  "bids": [["82.50", "100"], ["82.49", "50"]],  // [price, quantity]
  "asks": [["82.51", "75"], ["82.52", "200"]],
  "lastTradePrice": 82.50,
  "spread": 0.01,
  "midPrice": 82.505
}
```

**Bids** are sorted descending (highest first)
**Asks** are sorted ascending (lowest first)

The **spread** is the gap between the best bid and best ask - this is where trades happen!

### Tips

- The order book updates every 5 seconds automatically (liquidity injection)
- Place orders via API to see them appear in real-time
- Watch the spread - tighter spreads mean more liquidity
- Best bid/ask show the current market price range

---

## 📡 WebSocket API

You can also connect programmatically:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: [{
      name: 'orderbook',
      market: 'STOCK-INR',
      depth: 20
    }]
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

---

Enjoy watching the market in real-time! 🚀

