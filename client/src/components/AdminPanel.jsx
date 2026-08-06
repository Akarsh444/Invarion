import { useState } from 'react';
import { api } from '../lib/api';

export default function AdminPanel({ onProductCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [initialStock, setInitialStock] = useState('');
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setMessage('');
    try {
      await api.createProduct({
        name,
        description,
        price: Number(price),
        initialStock: Number(initialStock) || 0,
      });
      setMessage(`Created "${name}".`);
      setName(''); setDescription(''); setPrice(''); setInitialStock('');
      onProductCreated?.(); // refresh product grid
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  }

  return (
    <div className="mb-6 bg-white rounded-xl border border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 text-left font-medium text-gray-900 flex justify-between items-center"
      >
        Admin: Create Product
        <span className="text-gray-400">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <form onSubmit={handleCreate} className="p-4 pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              placeholder="Price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            placeholder="Initial stock"
            type="number"
            value={initialStock}
            onChange={(e) => setInitialStock(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          {message && <p className="text-sm text-gray-600">{message}</p>}
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
          >
            Create Product
          </button>
        </form>
      )}
    </div>
  );
}