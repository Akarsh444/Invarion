import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function OrdersList({ refreshSignal }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await api.getMyOrders();
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [refreshSignal]);

  if (loading) return <p className="text-gray-500">Loading orders...</p>;
  if (orders.length === 0) return <p className="text-gray-500 text-sm">No orders yet.</p>;

  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <div key={o.id} className="p-3 bg-white rounded-lg border border-gray-200 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Order {o.id.slice(0, 8)}
            </p>
            <p className="text-xs text-gray-500">
              {o.items?.length || 0} item(s) · ₹{Number(o.total).toLocaleString()}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-700'}`}>
            {o.status}
          </span>
        </div>
      ))}
    </div>
  );
}