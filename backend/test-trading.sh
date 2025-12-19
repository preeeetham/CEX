#!/bin/bash

# Simple trading script to test the CEX API
# Usage: ./test-trading.sh

BASE_URL="http://localhost:3000"
USER_ID="trader1"
MARKET="STOCK-INR"

echo "🚀 Testing CEX Trading API"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check server health
echo -e "${BLUE}1. Checking server health...${NC}"
curl -s "$BASE_URL/health" | jq .
echo ""

# 2. Get order book
echo -e "${BLUE}2. Getting order book for $MARKET...${NC}"
curl -s "$BASE_URL/api/v1/orderbook?market=$MARKET&depth=5" | jq .
echo ""

# 3. Place a buy order
echo -e "${BLUE}3. Placing a BUY order (100 @ 82.50)...${NC}"
BUY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/order" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d "{
    \"market\": \"$MARKET\",
    \"side\": \"BUY\",
    \"type\": \"LIMIT\",
    \"price\": 82.50,
    \"quantity\": 100
  }")

echo "$BUY_RESPONSE" | jq .
BUY_ORDER_ID=$(echo "$BUY_RESPONSE" | jq -r '.orderId')
echo -e "${GREEN}Buy Order ID: $BUY_ORDER_ID${NC}"
echo ""

# 4. Place a sell order
echo -e "${BLUE}4. Placing a SELL order (50 @ 82.60)...${NC}"
SELL_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/order" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d "{
    \"market\": \"$MARKET\",
    \"side\": \"SELL\",
    \"type\": \"LIMIT\",
    \"price\": 82.60,
    \"quantity\": 50
  }")

echo "$SELL_RESPONSE" | jq .
SELL_ORDER_ID=$(echo "$SELL_RESPONSE" | jq -r '.orderId')
echo -e "${GREEN}Sell Order ID: $SELL_ORDER_ID${NC}"
echo ""

# 5. Check order book again
echo -e "${BLUE}5. Checking order book again...${NC}"
curl -s "$BASE_URL/api/v1/orderbook?market=$MARKET&depth=5" | jq .
echo ""

# 6. Get all orders
echo -e "${BLUE}6. Getting all orders for user...${NC}"
curl -s "$BASE_URL/api/v1/orders" -H "x-user-id: $USER_ID" | jq .
echo ""

# 7. Get order status
echo -e "${BLUE}7. Getting buy order status...${NC}"
curl -s "$BASE_URL/api/v1/order/$BUY_ORDER_ID" -H "x-user-id: $USER_ID" | jq .
echo ""

# 8. Cancel buy order
echo -e "${YELLOW}8. Canceling buy order...${NC}"
curl -s -X DELETE "$BASE_URL/api/v1/order/$BUY_ORDER_ID" \
  -H "x-user-id: $USER_ID" | jq .
echo ""

# 9. Get trades
echo -e "${BLUE}9. Getting recent trades...${NC}"
curl -s "$BASE_URL/api/v1/trades?market=$MARKET&limit=10" | jq .
echo ""

# 10. Get market stats
echo -e "${BLUE}10. Getting market stats...${NC}"
curl -s "$BASE_URL/api/v1/market/stats?market=$MARKET" | jq .
echo ""

echo -e "${GREEN}✅ Testing complete!${NC}"

