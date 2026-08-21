// Central API client — all backend calls go through here.
// Automatically attaches the JWT token to requests when present.

// Frontend and backend are same-origin (Express serves the built React app),
// so the API path is always relative. Falls back to the env var if one is set,
// which allows pointing at a different backend during development if needed.
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Reads the token from localStorage (set on login)
function getToken() {
  return localStorage.getItem('token');
}

// Generic request helper
async function request(method, path, body = null, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Try to parse JSON; some endpoints may return empty
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    // Throw the API's error message so the UI can display it
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  // Auth
  register: (email, password, role) =>
    request('POST', '/auth/register', { email, password, role }),
  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),

  // Products
  getProducts: () => request('GET', '/products'),
  getProduct: (id) => request('GET', `/products/${id}`),
  createProduct: (data) => request('POST', '/products', data, true),

  // Inventory
  addStock: (productId, amount) =>
    request('POST', `/inventory/product/${productId}/add`, { amount }, true),

  // Orders
  createOrder: (idempotencyKey, items) =>
    request('POST', '/orders', { idempotencyKey, items }, true),
  getMyOrders: () => request('GET', '/orders/my', null, true),
};