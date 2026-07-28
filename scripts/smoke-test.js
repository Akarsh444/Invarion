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
    const { status, data } = await request('GET', '/api/db-test');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof data.userCount === 'number', 'userCount missing');
  });

  // 3. Register or login admin (handles both fresh and repeat runs)
  await test('Admin auth works (register or login)', async () => {
    let res = await request('POST', '/api/auth/register', {
      email: 'smoketest_admin@example.com',
      password: 'Admin1234',
      role: 'ADMIN',
    });

    if (res.status === 400) {
      // Already exists, login instead
      res = await request('POST', '/api/auth/login', {
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
    const { status, data } = await request('POST', '/api/auth/register', {
      email: `weak_${Date.now()}@example.com`,
      password: 'weak',
      role: 'CUSTOMER',
    });
    assert(status === 400, `Expected 400, got ${status}`);
    assert(data.error === 'Validation failed', 'Wrong error message');
  });

  // 5. Create product
  await test('Create product (ADMIN)', async () => {
    const { status, data } = await request('POST', '/api/products', {
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
    const { status } = await request('POST', '/api/products', {
      name: 'Should Fail',
      price: 100,
    });
    assert(status === 401, `Expected 401, got ${status}`);
  });

  // 7. Get all products (cache miss first time)
  await test('Get all products returns array', async () => {
    const { status, data } = await request('GET', '/api/products');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data), 'Response is not an array');
  });

  // 8. Get single product
  await test('Get single product by id', async () => {
    const { status, data } = await request('GET', `/api/products/${productId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.id === productId, 'Product id mismatch');
  });

  // 9. Get inventory for product
  await test('Get inventory shows correct initial stock', async () => {
    const { status, data } = await request('GET', `/api/inventory/product/${productId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.quantity === 10, `Expected quantity 10, got ${data.quantity}`);
    assert(data.available === 10, `Expected available 10, got ${data.available}`);
  });

  // 10. Add stock
  await test('Add stock increments quantity', async () => {
    const { status, data } = await request('POST', `/api/inventory/product/${productId}/add`, {
      amount: 20,
    }, adminToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.quantity === 30, `Expected quantity 30, got ${data.quantity}`);
  });

  // 11. Update stock (absolute set)
  await test('Update stock sets absolute value', async () => {
    const { status, data } = await request('PUT', `/api/inventory/product/${productId}`, {
      quantity: 50,
    }, adminToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.quantity === 50, `Expected quantity 50, got ${data.quantity}`);
  });

  // 12. Low stock check
  await test('Low stock endpoint includes product below threshold', async () => {
    const { status, data } = await request('GET', '/api/inventory/low-stock?threshold=60', null, adminToken);
    assert(status === 200, `Expected 200, got ${status}`);
    const found = data.find((inv) => inv.productId === productId);
    assert(found, 'Product not found in low stock list');
  });

  // 13. Update product
  await test('Update product changes price', async () => {
    const { status, data } = await request('PUT', `/api/products/${productId}`, {
      price: 48000,
    }, adminToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Number(data.price) === 48000, `Expected price 48000, got ${data.price}`);
  });

  // 14. Cache invalidation check - fetch right after update should reflect new price
  await test('Cache invalidates after update (fresh price served)', async () => {
    const { data } = await request('GET', `/api/products/${productId}`);
    assert(Number(data.price) === 48000, `Stale cache: expected 48000, got ${data.price}`);
  });

  // 15. Delete product
  await test('Delete product succeeds', async () => {
    const { status } = await request('DELETE', `/api/products/${productId}`, null, adminToken);
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // 16. Deleted product returns 404
  await test('Deleted product returns 404', async () => {
    const { status } = await request('GET', `/api/products/${productId}`);
    assert(status === 404, `Expected 404, got ${status}`);
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