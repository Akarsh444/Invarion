// Automated smoke test for Invarion API
// Run with: node scripts/smoke-test.js
// Tests the full flow: auth -> products -> inventory -> cache invalidation

const BASE_URL = 'http://localhost:3000';

// Simple colored console output
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;

let passed = 0;
let failed = 0;

// Wrapper for fetch that logs pass/fail
async function test(name, fn) {
  try {
    await fn();
    console.log(green(`✓ PASS: ${name}`));
    passed++;
  } catch (error) {
    console.log(red(`✗ FAIL: ${name}`));
    console.log(red(`  ${error.message}`));
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log(yellow('\n--- Starting Invarion API Smoke Test ---\n'));

  let adminToken, productId;

  // 1. Health check
  await test('Health check returns ok', async () => {
    const { status, data } = await request('GET', '/health');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.status === 'ok', 'Health status not ok');
  });

  // 2. DB connection check
  await test('Database connection works', async () => {
    const { status, data } = await request('GET', '/api/v1/db-test');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof data.userCount === 'number', 'userCount missing');
  });

  // 3. Register or login admin (handles both fresh and repeat runs)
  await test('Admin auth works (register or login)', async () => {
    let res = await request('POST', '/api/v1/auth/register', {
      email: 'smoketest_admin@example.com',
      password: 'Admin1234',
      role: 'ADMIN',
    });

    if (res.status === 400) {
      // Already exists, login instead
      res = await request('POST', '/api/v1/auth/login', {
        email: 'smoketest_admin@example.com',
        password: 'Admin1234',
      });
    }

    assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    assert(res.data.token, 'No token returned');
    adminToken = res.data.token;
  });

  // 4. Validation rejects weak password
  await test('Weak password is rejected', async () => {
    const { status, data } = await request('POST', '/api/v1/auth/register', {
      email: `weak_${Date.now()}@example.com`,
      password: 'weak',
      role: 'CUSTOMER',
    });
    assert(status === 400, `Expected 400, got ${status}`);
    assert(data.error === 'Validation failed', 'Wrong error message');
  });

  // 5. Create product
  await test('Create product (ADMIN)', async () => {
    const { status, data } = await request('POST', '/api/v1/products', {
      name: `Test Laptop ${Date.now()}`,
      description: 'Smoke test product',
      price: 50000,
      initialStock: 10,
    }, adminToken);
    assert(status === 201, `Expected 201, got ${status}`);
    assert(data.id, 'No product id returned');
    productId = data.id;
  });

  // 6. Create product fails without token
  await test('Create product fails without auth', async () => {
    const { status } = await request('POST', '/api/v1/products', {
      name: 'Should Fail',
      price: 100,
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // 7. Get all products (cache miss first time)
  await test('Get all products returns array', async () => {
    const { status, data } = await request('GET', '/api/v1/products');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Response is not an array');
  });

  // 8. Get single product
  await test('Get single product by id', async () => {
    const { status, data } = await request('GET', `/api/v1/products/${productId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.id === productId, 'Product id mismatch');
  });

  // 9. Get inventory for product
  await test('Get inventory shows correct initial stock', async () => {
    const { status, data } = await request('GET', `/api/v1/inventory/product/${productId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.quantity === 10, `Expected quantity 10, got ${data.quantity}`);
    assert(data.available === 10, `Expected available 10, got ${data.available}`);
  });

  // 10. Add stock
  await test('Add stock increments quantity', async () => {
    const { status, data } = await request('POST', `/api/v1/inventory/product/${productId}/add`, {
      amount: 20,
    }, adminToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.quantity === 30, `Expected quantity 30, got ${data.quantity}`);
  });

  // 11. Update stock (absolute set)
  await test('Update stock sets absolute value', async () => {
    const { status, data } = await request('PUT', `/api/v1/inventory/product/${productId}`, {
      quantity: 50,
    }, adminToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.quantity === 50, `Expected quantity 50, got ${data.quantity}`);
  });

  // 12. Low stock check
  await test('Low stock endpoint includes product below threshold', async () => {
    const { status, data } = await request('GET', '/api/v1/inventory/low-stock?threshold=60', null, adminToken);
    assert(status === 200, `Expected 200, got ${status}`);
    const found = data.find((inv) => inv.productId === productId);
    assert(found, 'Product not found in low stock list');
  });

  // 13. Update product
  await test('Update product changes price', async () => {
    const { status, data } = await request('PUT', `/api/v1/products/${productId}`, {
      price: 48000,
    }, adminToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Number(data.price) === 48000, `Expected price 48000, got ${data.price}`);
  });

  // 14. Cache invalidation check - fetch right after update should reflect new price
  await test('Cache invalidates after update (fresh price served)', async () => {
    const { data } = await request('GET', `/api/v1/products/${productId}`);
    assert(Number(data.price) === 48000, `Stale cache: expected 48000, got ${data.price}`);
  });

  // 15. Delete product
  await test('Delete product succeeds', async () => {
    const { status } = await request('DELETE', `/api/v1/products/${productId}`, null, adminToken);
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // 16. Deleted product returns 404
  await test('Deleted product returns 404', async () => {
    const { status } = await request('GET', `/api/v1/products/${productId}`);
    assert(status === 404, `Expected 404, got ${status}`);
  });

  // --- ORDER TESTS ---
  let orderProductId, firstIdempotencyKey;

  // 17. Create a fresh product with stock=1 for order testing
  await test('Create product with stock=1 for order tests', async () => {
    const { status, data } = await request('POST', '/api/v1/products', {
      name: `Order Test Product ${Date.now()}`,
      price: 1000,
      initialStock: 1,
    }, adminToken);
    assert(status === 201, `Expected 201, got ${status}`);
    orderProductId = data.id;
  });

  // 18. Successful order creation reserves stock
  await test('Create order reserves stock', async () => {
    firstIdempotencyKey = `smoke-order-${Date.now()}-a`;
    const { status, data } = await request('POST', '/api/v1/orders', {
      idempotencyKey: firstIdempotencyKey,
      items: [{ productId: orderProductId, quantity: 1 }],
    }, adminToken);
    assert(status === 201, `Expected 201, got ${status}: ${JSON.stringify(data)}`);
    assert(data.status === 'PENDING', `Expected PENDING, got ${data.status}`);
  });

  // 19. Idempotency - same key returns the same order, doesn't double-reserve
  await test('Duplicate idempotency key returns same order (200, not 201)', async () => {
    const { status, data } = await request('POST', '/api/v1/orders', {
      idempotencyKey: firstIdempotencyKey,
      items: [{ productId: orderProductId, quantity: 1 }],
    }, adminToken);
    assert(status === 200, `Expected 200 (replay), got ${status}`);
  });

  // 20. Insufficient stock is rejected (product now has 0 available after reservation)
  await test('Order fails with insufficient stock', async () => {
    const { status } = await request('POST', '/api/v1/orders', {
      idempotencyKey: `smoke-order-${Date.now()}-b`,
      items: [{ productId: orderProductId, quantity: 5 }],
    }, adminToken);
    assert(status === 409, `Expected 409, got ${status}`);
  });

  // 21. THE MONEY TEST - concurrent orders for the last unit, only one should win
  await test('Concurrent orders on last unit - no overselling', async () => {
    // Fresh product with exactly 1 unit in stock
    const { data: product } = await request('POST', '/api/v1/products', {
      name: `Concurrency Test ${Date.now()}`,
      price: 500,
      initialStock: 1,
    }, adminToken);

    // Fire TWO order requests at the exact same time for the same product, quantity 1 each
    const [resA, resB] = await Promise.all([
      request('POST', '/api/v1/orders', {
        idempotencyKey: `concurrency-a-${Date.now()}`,
        items: [{ productId: product.id, quantity: 1 }],
      }, adminToken),
      request('POST', '/api/v1/orders', {
        idempotencyKey: `concurrency-b-${Date.now()}`,
        items: [{ productId: product.id, quantity: 1 }],
      }, adminToken),
    ]);

    const statuses = [resA.status, resB.status].sort();
    assert(
      JSON.stringify(statuses) === JSON.stringify([201, 409]),
      `Expected one 201 and one 409, got ${resA.status} and ${resB.status}`
    );

    // Verify final inventory is consistent - not oversold
    const { data: inv } = await request('GET', `/api/v1/inventory/product/${product.id}`);
    assert(inv.available === 0, `Expected available 0, got ${inv.available}`);
    assert(inv.reserved === 1, `Expected reserved 1, got ${inv.reserved}`);
  });

  // 22. Invalid state transition is rejected
  await test('Invalid order status transition is rejected', async () => {
    // Get the order we created in test 18
    const orders = await request('GET', '/api/v1/orders/my', null, adminToken);
    const pendingOrder = orders.data.find((o) => o.status === 'PENDING');
    assert(pendingOrder, 'No pending order found to test transition');

    // PENDING -> DELIVERED is not allowed (must go through CONFIRMED, SHIPPED first)
    const { status } = await request('PATCH', `/api/v1/orders/${pendingOrder.id}/status`, {
      status: 'DELIVERED',
    }, adminToken);
    assert(status === 400, `Expected 400, got ${status}`);
  });

  // 23. Valid transition PENDING -> CONFIRMED deducts stock correctly
  await test('Confirming order deducts stock from quantity', async () => {
    const orders = await request('GET', '/api/v1/orders/my', null, adminToken);
    const pendingOrder = orders.data.find((o) => o.status === 'PENDING' && o.items.some(i => i.productId === orderProductId));
    assert(pendingOrder, 'No pending order found for confirm test');

    const { status } = await request('PATCH', `/api/v1/orders/${pendingOrder.id}/status`, {
      status: 'CONFIRMED',
    }, adminToken);
    assert(status === 200, `Expected 200, got ${status}`);

    const { data: inv } = await request('GET', `/api/v1/inventory/product/${orderProductId}`);
    assert(inv.quantity === 0, `Expected quantity 0 after confirm, got ${inv.quantity}`);
    assert(inv.reserved === 0, `Expected reserved 0 after confirm, got ${inv.reserved}`);
  });

  console.log(yellow('\n--- Results ---'));
  console.log(green(`Passed: ${passed}`));
  console.log(failed > 0 ? red(`Failed: ${failed}`) : `Failed: ${failed}`);
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(red('Smoke test crashed:'), err);
  process.exit(1);
});