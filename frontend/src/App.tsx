import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:3000";

export default function App() {
  const [depth, setDepth] = useState({ bids: [], asks: [] });
  const [balances, setBalances] = useState({ USD: 0, GOOGLE: 0 });
  const [form, setForm] = useState({ userId: "1", side: "bid", price: 1000, quantity: 1 });

  const fetchDepth = async () => {
    const res = await axios.get(`${API}/depth`);
    setDepth(res.data);
  };

  const fetchBalance = async () => {
    const res = await axios.get(`${API}/balance/${form.userId}`);
    setBalances(res.data);
  };

  const placeOrder = async () => {
    await axios.post(`${API}/order`, form);
    fetchDepth();
    fetchBalance();
  };

  useEffect(() => {
    fetchDepth();
    fetchBalance();
  }, [form.userId]);

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Simple Order Book UI</h2>
      <div>
        <label>User:
          <select onChange={(e) => setForm({ ...form, userId: e.target.value })}>
            <option value="1">User 1</option>
            <option value="2">User 2</option>
          </select>
        </label>
        <p>USD: {balances.USD} | GOOGLE: {balances.GOOGLE}</p>
      </div>

      <hr />

      <div>
        <label>Side:
          <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}>
            <option value="bid">Buy (Bid)</option>
            <option value="ask">Sell (Ask)</option>
          </select>
        </label>
        <br />
        <label>Price: <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></label>
        <br />
        <label>Quantity: <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></label>
        <br />
        <button onClick={placeOrder}>Place Order</button>
      </div>

      <hr />

      <h3>Order Book</h3>
      <div style={{ display: "flex", gap: "20px" }}>
        <div>
          <h4>Bids</h4>
          {depth.bids?.map((bid: any, i: number) => (
            <div key={i}>Price: {bid.price} | Qty: {bid.quantity}</div>
          ))}
        </div>
        <div>
          <h4>Asks</h4>
          {depth.asks?.map((ask: any, i: number) => (
            <div key={i}>Price: {ask.price} | Qty: {ask.quantity}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
