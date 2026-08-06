import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ProductGrid({ refreshSignal, onOrderPlaced }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Fetch products (with their inventory) from the API
  async function loadProducts() {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      setMessage(`Error loading products: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Reload whenever the parent signals a change (new product, order placed, etc.)
  useEffect(() => {
    loadProducts();
  }, [refreshSignal]);

  // Place an order for 1 unit of a product
  async function handleOrder(productId) {
    setMessage('');
    try {
      // Generate a unique idempotency key per order attempt
      const idempotencyKey = `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await api.createOrder(idempotencyKey, [{ productId, quantity: 1 }]);
      setMessage('Order placed — stock reserved.');
      loadProducts();          // refresh to show updated stock
      onOrderPlaced?.();       // tell parent to refresh orders list
    } catch (err) {
      setMessage(`Order failed: ${err.message}`);
    }
  }

  if (loading) return <p className="text-gray-500">Loading products...</p>;

  return (
    <div>
      {message && (
        <div className="mb-4 p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700">
          {message}
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-gray-500">No products yet. {user.role === 'ADMIN' && 'Create one above.'}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((p) => {
            const available = p.inventory
              ? p.inventory.quantity - p.inventory.reserved
              : 0;
            return (
              <div key={p.id} className="p-4 bg-white rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{p.description || 'No description'}</p>
                <p className="text-lg font-bold text-gray-900">₹{Number(p.price).toLocaleString()}</p>

                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-sm font-medium ${available > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {available > 0 ? `${available} in stock` : 'Out of stock'}
                  </span>
                  <button
                    onClick={() => handleOrder(p.id)}
                    disabled={available <= 0}
                    className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-40"
                  >
                    Order 1
                  </button>
                </div>

                {p.inventory && p.inventory.reserved > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {p.inventory.reserved} reserved
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}