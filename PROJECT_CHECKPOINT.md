# Invarion Project Checkpoint

**Last Updated:** July 28, 2026  
**Phase:** Phase 2 Complete — Order System with Distributed Locking  
**Status:** Auth, Products, Inventory, and Orders all built and fully tested. Moving to Phase 3 (Docker + CI/CD + Railway deployment)  
**Repo:** https://github.com/Akarsh444/Invarion

---

## Project Overview

**Project Name:** Invarion - Concurrent Inventory & Order Engine  
**Formerly named:** StockSync (renamed before public/resume use for a stronger, more distinctive identity — "StockSync" read as tutorial-tier; "Invarion" reads as a real infra product name)  
**Goal:** Production-grade backend system demonstrating concurrent inventory management with distributed locking, idempotency, and exactly-once order semantics. Built specifically to demonstrate depth over feature count — the core engineering problem (safe concurrent stock reservation) is solved and provable via an automated test, not just claimed.

**Timeline:** Originally planned as a 10-week build. Timeline slipped due to a ~3-month gap (7th semester + internship commitments). Resumed July 24, 2026 with a compressed remaining scope — pushing hard to finish similar engineering depth in a shorter window rather than cutting scope.

**Daily Time Investment:** 2.5-3 hours (variable depending on day)

**Target audience for this project:** Product-based companies (Razorpay, CRED, Zepto, Groww tier) — the project intentionally avoids AWS (billing risk for a student) and avoids generic CRUD-tutorial territory in favor of a specific, hard, well-known distributed systems problem.

---

## Tech Stack (LOCKED - DO NOT CHANGE)

- **Runtime:** Node.js 22.22.2
- **Framework:** Express.js
- **Database:** PostgreSQL 16 (via Prisma ORM v7, using the `@prisma/adapter-pg` adapter required by Prisma v7's new config system)
- **Cache / Locking:** Redis (caching layer AND distributed lock primitive — dual purpose)
- **Auth:** JWT + bcrypt
- **Validation:** express-validator
- **Rate Limiting:** express-rate-limit
- **Testing:**
  - Unit tests: Jest (13 checks — password hashing, JWT, auth middleware, run via `npm test`, no server needed)
  - End-to-end / smoke tests: custom Node script using native `fetch` (23 checks — full API flow including a real concurrency race test, run via `npm run smoke`, requires server running)
- **Containerization:** Docker (not yet implemented — Phase 3)
- **CI/CD:** GitHub Actions (not yet implemented — Phase 3)
- **Deployment:** Railway (not yet implemented — Phase 3; AWS deliberately excluded project-wide to avoid billing risk)
- **Dev Tools:** nodemon, ESLint, Prettier, REST Client (VS Code extension, legacy manual testing — superseded by smoke-test.js for regular use)

---

## Environment Details

**Operating System:** Windows 11 with WSL2 (Ubuntu 22.04)  
**User:** akarsh  
**Project Location:** `/home/akarsh/invarion`

**Services Running:**

- PostgreSQL: `sudo service postgresql start`
- Redis: `sudo service redis-server start`
- Dev Server: `npm run dev` (runs on port 3000)

---

## Database Schema (Prisma)

### Models

**User**

- id: String (UUID)
- email: String (unique)
- password: String (hashed with bcrypt)
- role: Enum (ADMIN | CUSTOMER)
- createdAt, updatedAt: DateTime
- Relation: orders (one-to-many)

**Product**

- id: String (UUID)
- name: String
- description: String (optional)
- price: Decimal (NOT Float - money precision)
- createdAt, updatedAt: DateTime
- Relation: inventory (one-to-one), orderItems (one-to-many)

**Inventory**

- id: String (UUID)
- productId: String (unique)
- quantity: Int (total stock)
- reserved: Int (locked for pending orders)
- version: Int (for optimistic concurrency control)
- updatedAt: DateTime
- Relation: product (one-to-one)

**Order**

- id: String (UUID)
- userId: String
- status: Enum (PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED)
- idempotencyKey: String (unique - prevents duplicate orders)
- total: Decimal
- createdAt, updatedAt: DateTime
- Relation: user (many-to-one), items (one-to-many)

**OrderItem**

- id: String (UUID)
- orderId: String
- productId: String
- quantity: Int
- price: Decimal (price at time of order - frozen)
- Relation: order (many-to-one), product (many-to-one)

### Key Design Decisions

1. **UUID over auto-increment:** Security (can't guess IDs) + distributed systems compatibility
2. **Inventory separate from Product:** Different read/write patterns, enables optimistic locking
3. **reserved field in Inventory:** Locks stock for pending orders, prevents overselling
4. **version field in Inventory:** Optimistic concurrency control (will implement in Phase 3)
5. **idempotencyKey in Order:** Prevents duplicate orders from retries/double-clicks
6. **Decimal for money:** Exact precision, Float causes rounding errors
7. **price frozen in OrderItem:** Product price can change, order history stays accurate

---

## Project Structure

```
invarion/
├── src/
│   ├── config/
│   │   ├── db.js                      # Prisma client, instantiated with PrismaPg adapter (required in Prisma v7)
│   │   └── redis.js                   # Redis client connection, auto-connects on import, logs connect/error events
│   ├── controllers/
│   │   ├── auth.controller.js         # register, login
│   │   ├── product.controller.js      # createProduct, getAllProducts, getProductById, updateProduct, deleteProduct
│   │   ├── inventory.controller.js    # getInventory, updateStock, addStock, getLowStock
│   │   └── order.controller.js        # create, getOrderById, getMyOrders, updateStatus — thin, delegates business logic to order.service.js
│   ├── middlewares/
│   │   ├── auth.middleware.js         # authenticate (JWT verify), requireAdmin (role check)
│   │   ├── validation.middleware.js   # validate() — runs express-validator's validationResult, returns 400 with field-level errors on failure
│   │   ├── validators.js              # All validation rule arrays: registerValidation, loginValidation, createProductValidation, updateProductValidation, updateStockValidation, addStockValidation, createOrderValidation, updateOrderStatusValidation
│   │   ├── cache.middleware.js        # cacheMiddleware(ttlSeconds) — wraps res.json to cache GET responses in Redis; invalidateCache(pattern) — deletes matching keys on writes
│   │   └── rateLimit.middleware.js    # generalLimiter (100 req/15min, all routes), authLimiter (5 req/15min, auth routes only)
│   ├── models/                        # (Prisma schema handles this — no separate model files)
│   ├── routes/
│   │   ├── auth.routes.js             # mounts authLimiter + validators + controllers for /register, /login
│   │   ├── test.routes.js             # /db-test — simple DB connectivity check
│   │   ├── product.routes.js          # public GET routes wrapped in cacheMiddleware(300); ADMIN-only writes with validators
│   │   ├── inventory.routes.js        # public GET stock check; ADMIN-only stock mutations
│   │   └── order.routes.js            # authenticated order creation, own-orders listing, single order fetch, ADMIN-only status updates
│   ├── services/
│   │   └── order.service.js           # THE core engineering logic of the whole project: createOrder() (idempotency check, distributed locking, stock validation, atomic order+inventory transaction), updateOrderStatus() (state machine enforcement + inventory side effects), ALLOWED_TRANSITIONS map
│   ├── utils/
│   │   ├── jwt.js                     # generateToken, verifyToken (HS256, 7-day expiry)
│   │   ├── password.js                # hashPassword (bcrypt, 10 salt rounds), comparePassword
│   │   └── lock.js                    # acquireLock (Redis SET NX PX with retry loop), releaseLock (Lua script, token-checked atomic delete)
│   └── index.js                       # Express app bootstrap: middleware stack (helmet, cors, morgan, json, generalLimiter), API_VERSION constant, all route mounting under /api/v1
├── prisma/
│   ├── schema.prisma                  # 5 models: User, Product, Inventory, Order, OrderItem
│   ├── migrations/
│   │   └── 20260512163559_init/
│   │       └── migration.sql          # Initial migration — all 5 tables, enums (Role, OrderStatus), foreign keys
│   └── prisma.config.ts               # Required in Prisma v7 — defines schema path + PrismaPg adapter for `migrate dev`, reads DATABASE_URL via dotenv
├── scripts/
│   └── smoke-test.js                  # 23 automated checks against a LIVE running server. Uses native fetch, colored console output (green/red), exits with code 1 on any failure — CI-friendly. Includes the concurrency race test (fires two simultaneous order requests, asserts exactly one 201 + one 409).
├── tests/
│   └── unit/
│       ├── password.test.js           # 4 tests — hash differs from plain, salting produces different hashes each time, correct/incorrect password comparison
│       ├── jwt.test.js                # 4 tests — token structure (3 parts), correct decode, null on invalid token, null on tampered signature
│       └── auth.middleware.test.js    # 5 tests — authenticate + requireAdmin tested in isolation via mocked req/res/next objects (no real server needed)
├── jest.setup.js                      # require('dotenv').config() — runs before every test file since tests import modules directly and bypass index.js's own dotenv call
├── .env                                # PORT, DATABASE_URL, REDIS_URL, JWT_SECRET, NODE_ENV (NOT committed)
├── .gitignore                          # node_modules, .env variants, dist/build, logs, OS files, editor configs, coverage, Prisma dev.db
├── package.json                        # scripts: start, dev, test, smoke — plus a top-level "jest" config block pointing to jest.setup.js
├── test.http                           # REST Client manual requests — legacy from before smoke-test.js existed, kept for quick ad-hoc manual checks but smoke-test.js is now the primary testing method
└── PROJECT_CHECKPOINT.md               # This file
```

---

## Environment Variables (.env)

```env
PORT=3000
DATABASE_URL=postgresql://akarsh:akarsh444@localhost:5432/stocksync
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_key_change_this
NODE_ENV=development
```

**CRITICAL:** Never commit .env to Git (already in .gitignore)

---

## Dependencies Installed

**Production:**

- express — web framework
- dotenv — loads .env into process.env
- cors — cross-origin request handling
- helmet — security headers middleware
- morgan — HTTP request logger
- prisma — ORM CLI
- @prisma/client — generated query client
- @prisma/adapter-pg — required in Prisma v7 for PostgreSQL connections (the old `datasource.url` approach in schema.prisma was deprecated in v7)
- bcryptjs — password hashing
- jsonwebtoken — JWT generation/verification
- express-validator — request body validation
- redis — official Redis client (v4+, promise-based)
- express-rate-limit — rate limiting middleware

**Dev:**

- nodemon — auto-restart on file changes
- jest — test runner
- supertest — installed but not currently used (originally planned for integration tests against an in-process server; smoke-test.js ended up covering this role against a real running server instead)
- eslint — linting
- prettier — code formatting
- typescript — required for prisma.config.ts (Prisma v7 config files are TypeScript)
- ts-node — allows Prisma CLI to execute the TypeScript config file
- @types/node, @types/bcryptjs, @types/jsonwebtoken — type definitions (used loosely, project is plain JS not TS, but these satisfy prisma.config.ts's TS compilation)

---

## What's Working Right Now

**Important — API versioning:** All routes now live under `/api/v1/*` instead of the original `/api/*`. This was a deliberate refactor completed in Phase 1's final week so that future breaking changes can be introduced at `/api/v2/*` without breaking existing clients. If you see `/api/products` anywhere in old notes, mentally prepend `/v1`.

### System Health & DB Check

```http
GET /health
Response 200: { "status": "ok", "message": "StockSync API running" }

GET /api/v1/db-test
Response 200: { "message": "Database connected", "userCount": <number> }
```

### Authentication Endpoints

Both routes are rate-limited to **5 requests per 15 minutes per IP** (authLimiter) to slow brute-force attempts, and validated via express-validator before hitting the controller.

```http
POST /api/v1/auth/register
Content-Type: application/json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "role": "CUSTOMER"
}

Validation rules:
- email: must be valid email format, gets normalized
- password: min 8 chars, must contain a number, must contain an uppercase letter
- role: optional, must be ADMIN or CUSTOMER if provided

Response 201:
{
  "user": { "id": "uuid", "email": "user@example.com", "role": "CUSTOMER" },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
Response 400: { "error": "Validation failed", "details": [{ "field": "password", "message": "Password must contain a number" }, ...] }
Response 400: { "error": "Email already registered" }
Response 429: { "error": "Too many auth attempts, please try again later" } (after 5 attempts in 15min)
```

```http
POST /api/v1/auth/login
Content-Type: application/json
{ "email": "user@example.com", "password": "SecurePass123" }

Response 200: { "user": {...}, "token": "eyJhbG..." }
Response 401: { "error": "Invalid credentials" }
```

### Product Endpoints

**Public GET routes are cached in Redis for 300 seconds (5 minutes).** First request in that window is a cache MISS (hits PostgreSQL, logs to console), subsequent requests within the window are a cache HIT (served from Redis, no DB hit, logs to console). Cache is automatically invalidated (deleted) whenever a product is created, updated, or deleted, so stale data is never served after a write.

```http
GET /api/v1/products                    # public, cached
GET /api/v1/products/:id                # public, cached
Response 404 (single): { "error": "Product not found" }

POST /api/v1/products                   # ADMIN only, validated
Authorization: Bearer {admin_token}
{
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": 75000,
  "initialStock": 10
}

Validation rules:
- name: required, 1-200 chars, trimmed
- description: optional, max 1000 chars
- price: required, must be a positive float (min 0.01)
- initialStock: optional, must be a non-negative integer

Response 201: { "id": "uuid", "name": "Laptop", "description": "...", "price": "75000", "createdAt": "...", "updatedAt": "..." }
(Note: product + its inventory record are created together inside a single Prisma $transaction — if inventory creation fails, product creation is rolled back too, so an orphaned product without inventory can never exist)

PUT /api/v1/products/:id                # ADMIN only, validated (all fields optional — partial update)
DELETE /api/v1/products/:id             # ADMIN only (deletes inventory record first, then product, inside a transaction)

Response 401: { "error": "No token provided" }
Response 403: { "error": "Admin access required" }
```

### Inventory Endpoints

```http
GET /api/v1/inventory/product/:productId          # public — check stock
Response 200: {
  "id": "uuid", "productId": "uuid",
  "quantity": 50, "reserved": 0, "version": 2,
  "available": 50,   // calculated field: quantity - reserved, not stored in DB
  "product": { "id": "uuid", "name": "Laptop", "price": "75000", ... }
}

PUT /api/v1/inventory/product/:productId           # ADMIN only — SETS absolute quantity value
{ "quantity": 50 }
(quantity=30 becomes exactly 50, NOT 30+50. version increments.)

POST /api/v1/inventory/product/:productId/add      # ADMIN only — INCREMENTS existing quantity
{ "amount": 20 }
(quantity=30 becomes 30+20=50. version increments. Uses Prisma's { increment: amount } for an atomic DB-level add, not a read-then-write.)

GET /api/v1/inventory/low-stock?threshold=10        # ADMIN only
Response 200: [ { ...inventory records where (quantity - reserved) < threshold... } ]
```

### Order Endpoints (NEW — Phase 2)

```http
POST /api/v1/orders                     # authenticated (any logged-in user)
Authorization: Bearer {token}
{
  "idempotencyKey": "unique-string-per-checkout-attempt",
  "items": [{ "productId": "uuid", "quantity": 1 }, ...]
}

Validation rules:
- idempotencyKey: required string, min 10 chars
- items: required non-empty array
- items[].productId: required string
- items[].quantity: required positive integer

Response 201: newly created order (status PENDING), stock reserved (not yet deducted)
{
  "id": "uuid", "userId": "uuid", "status": "PENDING",
  "idempotencyKey": "...", "total": "75000",
  "items": [{ "id": "uuid", "orderId": "uuid", "productId": "uuid", "quantity": 1, "price": "75000" }]
}

Response 200: SAME order returned if this exact idempotencyKey was already processed before
  (this is the idempotency guarantee — safe to retry a failed/timed-out request without
  creating a duplicate order or double-reserving stock)

Response 409: { "error": "Insufficient stock", "details": "INSUFFICIENT_STOCK:{productId}:{availableCount}" }
Response 409: { "error": "System busy, please try again", "details": "LOCK_TIMEOUT:{productId}" }
  (this means the distributed lock couldn't be acquired within the retry window —
  another request was holding it for the full 2-second retry period, which in practice
  only happens under genuinely heavy contention on the exact same product)
Response 404: { "error": "Product not found", "details": "PRODUCT_NOT_FOUND:{productId}" }
```

```http
GET /api/v1/orders/my                   # authenticated — returns only the logged-in user's own orders
Authorization: Bearer {token}
Response 200: [ {...order with items...}, ... ]  sorted newest first

GET /api/v1/orders/:id                  # authenticated — owner or ADMIN only
Authorization: Bearer {token}
Response 200: { ...order with items and product details... }
Response 403: { "error": "Not authorized to view this order" }  (if requester is neither the owner nor ADMIN)
Response 404: { "error": "Order not found" }

PATCH /api/v1/orders/:id/status         # ADMIN only, validated
Authorization: Bearer {admin_token}
{ "status": "CONFIRMED" }   // or SHIPPED, DELIVERED, CANCELLED

Validation: status must be one of CONFIRMED, SHIPPED, DELIVERED, CANCELLED (PENDING is the only
  initial state and can never be set via this endpoint)

Response 200: updated order object
Response 400: { "error": "Invalid status transition", "details": "INVALID_TRANSITION:PENDING:DELIVERED" }
  (enforced by the state machine — see the dedicated section below for the full transition map)
Response 404: { "error": "Order not found" }
```

### Automated Testing Suite

**Unit tests — `npm test` (Jest, 13 checks, no server or DB required):**

- `password.test.js` (4): hash differs from plaintext; same password produces different hashes each call due to salting; correct password validates true; wrong password validates false
- `jwt.test.js` (4): generated token has valid 3-part JWT structure; valid token decodes to correct payload; garbage string returns null (not a throw); tampered/corrupted signature returns null
- `auth.middleware.test.js` (5): `authenticate` calls next() and attaches req.user on valid token; returns 401 with no Authorization header; returns 401 on invalid token; `requireAdmin` calls next() for ADMIN role; returns 403 for CUSTOMER role

**Smoke test — `npm run smoke` (custom script, 23 checks, requires the dev server running on port 3000):**

This is the primary regression-testing method for this project going forward — instead of manually clicking through REST Client requests after every change, this script exercises the entire API surface in ~2 seconds and prints a clear pass/fail summary.

1. Health check returns ok
2. Database connection works
3. Admin auth works (register-or-login against a dedicated `smoketest_admin@example.com` account — separate from any manually created admin account to avoid password/validation-rule collisions across runs)
4. Weak password is correctly rejected by validation
5. Create product succeeds as ADMIN
6. Create product fails without auth (401)
7. Get all products returns an array
8. Get single product by id
9. Get inventory shows correct initial stock
10. Add stock correctly increments quantity
11. Update stock correctly sets absolute value
12. Low stock endpoint includes a product below threshold
13. Update product changes price
14. Cache correctly invalidates after update (fresh price served immediately, not stale cached price)
15. Delete product succeeds
16. Deleted product returns 404
17. Create a dedicated product with stock=1 for order testing
18. Create order successfully reserves stock (201, status PENDING)
19. Duplicate idempotency key returns the SAME order (200, not a second 201 — proves no duplicate order/reservation)
20. Order fails with 409 when requesting more than available stock
21. **Concurrent orders on last unit of stock — no overselling.** Fires two order requests simultaneously via `Promise.all` for a product with exactly 1 unit in stock. Asserts exactly one request gets 201 (success) and the other gets 409 (rejected), then re-fetches inventory and asserts `available: 0` and `reserved: 1` — proving the final state is consistent and stock was never oversold. **This is the single most important test in the entire project — it is the automated proof that the distributed locking actually works under real concurrent load, not just in theory.**
22. Invalid order status transition is correctly rejected (e.g. PENDING → DELIVERED skipping intermediate states)
23. Confirming a PENDING order correctly deducts stock (quantity decrements, reserved decrements by the same amount)

**How to run both after any change:**

```bash
npm test          # unit tests, ~1 second, no server needed
npm run smoke      # end-to-end tests, ~2 seconds, requires `npm run dev` running in another terminal
```

### Database State (as of last full test run)

- Multiple User records exist, including a dedicated `smoketest_admin@example.com` account used exclusively by the automated smoke test
- Product, Inventory, Order, and OrderItem tables all actively populated and exercised by both manual testing and the smoke test
- All 5 Prisma models (User, Product, Inventory, Order, OrderItem) confirmed working end-to-end including their relations

### Database State

- **Users:** 2 users exist
  - test@example.com (CUSTOMER role)
  - admin@example.com (ADMIN role)
  - All passwords hashed with bcrypt (NOT stored plain)
- **Products:** Can be created/updated/deleted via API
- **Inventory:** Automatically created with each product, tracks quantity/reserved/version
- **Orders:** Table exists but empty (not yet implemented)
- **OrderItems:** Table exists but empty (not yet implemented)

### Authentication & Authorization Verified

✅ ADMIN can create/update/delete products  
✅ ADMIN can manage inventory (set/add stock, view low stock)  
✅ CUSTOMER blocked from admin operations (403 Forbidden)  
✅ Unauthenticated requests to protected routes blocked (401 Unauthorized)  
✅ Anyone can view products and inventory (public read access)  
✅ JWT tokens expire after 7 days  
✅ Tokens properly verified on each protected request

---

## How Auth Works (Detailed)

### Registration Flow:

1. User sends email + password
2. Server checks if email already exists (prevents duplicates)
3. Password hashed with bcrypt (10 salt rounds)
4. User created in database with hashed password
5. JWT token generated containing: userId, email, role
6. Token signed with JWT_SECRET, expires in 7 days
7. Return user object (without password) + token

### Login Flow:

1. User sends email + password
2. Server finds user by email
3. bcrypt.compare(plainPassword, hashedPassword) - constant time comparison
4. If valid, generate new JWT token
5. Return user object + token

### JWT Token Structure:

Header.Payload.Signature
eyJhbGci... (algorithm: HS256)
.eyJ1c2VySWQ... (data: userId, email, role, iat, exp)
.j-iculvT... (signature: proves authenticity)

**How it will be used:**

- Frontend stores token (localStorage/sessionStorage)
- Every protected request includes: `Authorization: Bearer <token>`
- Middleware verifies token, extracts userId
- Controller knows which user is making request

---

## How Middleware Protection Works (Detailed)

### authenticate Middleware Flow:

**Location:** `src/middlewares/auth.middleware.js`

**Step-by-step execution:**

1. Extract `Authorization` header from request
   - Expected format: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
2. Check if header exists and starts with "Bearer "
   - If missing → return 401 `{ "error": "No token provided" }`
3. Extract token by removing "Bearer " prefix (substring from position 7)
4. Call `verifyToken(token)` which uses `jwt.verify(token, JWT_SECRET)`
   - If token expired → returns null
   - If signature invalid → returns null
   - If valid → returns decoded payload `{ userId, email, role, iat, exp }`
5. If verification failed → return 401 `{ "error": "Invalid or expired token" }`
6. If verification succeeded:
   - Attach decoded data to `req.user` object
   - Call `next()` to pass control to next middleware/controller
7. All subsequent middlewares and controllers can access `req.user.userId`, `req.user.email`, `req.user.role`

**Code:**

```javascript
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.user = decoded; // { userId, email, role }
  next();
}
```

### requireAdmin Middleware Flow:

**Location:** `src/middlewares/auth.middleware.js`

**Prerequisite:** MUST run after `authenticate` middleware (assumes `req.user` exists)

**Step-by-step execution:**

1. Check if `req.user.role === 'ADMIN'`
2. If NOT ADMIN → return 403 `{ "error": "Admin access required" }`
3. If ADMIN → call `next()` to proceed to controller

**Code:**

```javascript
function requireAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
```

### Middleware Chaining Example:

**Route definition:**

```javascript
router.post("/products", authenticate, requireAdmin, createProduct);
```

**Execution flow for this request:**
Request arrives: POST /api/products with body { name: "Laptop", price: 75000 }
authenticate middleware runs:
Checks for token in Authorization header
If missing/invalid → 401 error, CHAIN STOPS
If valid → attaches req.user, calls next()
requireAdmin middleware runs:
Checks req.user.role
If not ADMIN → 403 error, CHAIN STOPS
If ADMIN → calls next()
createProduct controller runs:
Has access to req.user.userId (knows who's creating)
Creates product in database
Returns 201 response

**Key insight:** If ANY middleware in the chain doesn't call `next()`, the chain stops and the response is sent immediately. This is how protection works.

---

## How Product + Inventory Work Together

### Why They're Separate Tables:

**Read/Write Pattern Difference:**

- **Product:** Read-heavy (thousands of users browsing catalog)
- **Inventory:** Write-heavy (stock updates on every order/restock)

**Benefits of Separation:**

1. Can cache product catalog aggressively without worrying about stale stock data
2. Inventory table can use optimistic locking (version field) without affecting product reads
3. Database indexes optimized differently for each table
4. Easier to scale - could move inventory to separate database later

### Creating a Product (Atomic Transaction):

**Code in `product.controller.js`:**

```javascript
const product = await prisma.$transaction(async (tx) => {
  const newProduct = await tx.product.create({
    data: { name, description, price },
  });
  await tx.inventory.create({
    data: {
      productId: newProduct.id,
      quantity: initialStock || 0,
      reserved: 0,
    },
  });
  return newProduct;
});
```

**Why transaction?**

- If product creation succeeds but inventory creation fails → product is rolled back (both operations succeed or both fail)
- Prevents orphaned products without inventory records
- Database ensures atomicity (ACID properties)

**What happens in database:**

```sql
BEGIN;
  INSERT INTO products (id, name, description, price) VALUES (...);
  INSERT INTO inventory (id, productId, quantity, reserved) VALUES (...);
COMMIT;  -- Both succeed

-- OR if inventory fails:
ROLLBACK;  -- Both undone, product not created
```

### Inventory Fields Explained in Detail:

**quantity (Int):**

- Total stock physically in warehouse
- Updated when:
  - New stock arrives → increment via `addStock`
  - Physical inventory count → set absolute via `updateStock`
  - Order confirmed → decrement (Phase 3)

**reserved (Int):**

- Stock locked for pending orders (payment processing, not yet confirmed)
- Prevents overselling: if 10 in stock and 3 reserved, only 7 available to buy
- Updated when:
  - Order created → increment by order quantity
  - Order confirmed → decrement (stock already deducted from quantity)
  - Order cancelled/timeout → decrement (release the lock)

**available (Calculated Field - Not Stored):**

- Formula: `quantity - reserved`
- Represents what customers can actually purchase right now
- Calculated on-the-fly in controller responses
- Example:
  - quantity: 50
  - reserved: 12 (3 pending orders: 5 units, 4 units, 3 units)
  - available: 38 (what new customers can buy)

**version (Int):**

- Starts at 0, increments on every update
- Used for optimistic concurrency control (implements in Phase 3)
- How it works:

```javascript
// User A reads: { quantity: 10, version: 5 }
// User B reads: { quantity: 10, version: 5 }
// User A updates: SET quantity = 8 WHERE version = 5, version = 6
// User B tries: SET quantity = 7 WHERE version = 5 → FAILS (version is now 6)
// User B must re-read and retry
```

- Prevents lost updates in concurrent scenarios

### Stock Operations Detailed:

**updateStock (PUT /api/inventory/product/:id):**

- **Use case:** Physical inventory count, manual correction
- **Behavior:** Sets ABSOLUTE value
- **Example:**
  - Current: quantity = 30
  - Request: `{ "quantity": 50 }`
  - Result: quantity = 50 (NOT 30 + 50 = 80)
- **Version incremented:** Yes (triggers optimistic lock check in Phase 3)

**addStock (POST /api/inventory/product/:id/add):**

- **Use case:** New shipment arrived, restocking
- **Behavior:** INCREMENTS existing value
- **Example:**
  - Current: quantity = 30
  - Request: `{ "amount": 20 }`
  - Result: quantity = 50 (30 + 20)
- **Database operation:** `UPDATE inventory SET quantity = quantity + 20 WHERE ...`
- **Version incremented:** Yes

**getLowStock (GET /api/inventory/low-stock?threshold=10):**

- **Use case:** Reorder alerts, stock monitoring dashboards
- **Behavior:** Returns products where `available < threshold`
- **Query flow:**
  1. Fetch all inventory records with product details
  2. Calculate `available = quantity - reserved` for each
  3. Filter where `available < threshold`
  4. Return filtered list
- **Threshold:** Defaults to 5 if not provided, configurable via query param

---

---

## How Input Validation Works

**Location:** `src/middlewares/validation.middleware.js` + `src/middlewares/validators.js`

**Pattern:** Each route gets an array of express-validator rule chains (defined once in `validators.js`, reused across routes) inserted into the middleware chain BEFORE the generic `validate` middleware, which itself runs before the controller:

```javascript
router.post("/register", authLimiter, registerValidation, validate, register);
```

**Execution order:** `authLimiter` (rate limit check) → `registerValidation` (array of rule chains, each attaches any errors to the request internally without stopping execution) → `validate` (reads accumulated errors via `validationResult(req)`; if any exist, responds 400 with a structured `details` array and the chain stops here — controller never runs) → `register` controller (only reached if validation passed cleanly).

**Why centralize validation instead of `if` checks inside controllers:** Before this was added, controllers had scattered checks like `if (price <= 0) return res.status(400)...`. This works but doesn't scale — every controller reinvents its own validation logic and error format. Centralizing into named rule-chain exports means: one consistent error response shape across the entire API, validation logic is testable/reusable independent of any specific controller, and adding a new validated field is a one-line change in `validators.js` rather than editing controller logic.

**Example error response shape (consistent everywhere):**

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    },
    { "field": "password", "message": "Password must contain a number" }
  ]
}
```

---

## How Redis Caching Works

**Location:** `src/config/redis.js`, `src/middlewares/cache.middleware.js`

### The Connection

`redis.js` creates a single shared client using `REDIS_URL` from `.env`, connects immediately on module load (top-level async IIFE), and logs connect/error events. This client is imported wherever caching or locking is needed — one connection, reused everywhere (not a new connection per request).

### The Caching Strategy: Cache-Aside (Lazy Loading)

`cacheMiddleware(ttlSeconds)` is a middleware **factory** — calling it returns a middleware function configured with a specific TTL, which is why routes look like `cacheMiddleware(300)` rather than just `cacheMiddleware`.

**On every GET request to a cached route:**

1. Build a cache key from the full URL including query params: `cache:${req.originalUrl}` (e.g. `cache:/api/v1/products`)
2. Check Redis for that key
3. **Cache HIT:** return the cached JSON immediately — the request never touches PostgreSQL or the controller at all
4. **Cache MISS:** intercept `res.json` (wrap the original function) so that whenever the controller eventually calls `res.json(data)`, the middleware catches the outgoing data, stores it in Redis with the configured TTL via `setEx`, and only then sends the actual response

**Why intercept `res.json` instead of caching before the controller runs:** The middleware doesn't know what the controller will return in advance — it has to let the controller execute normally on a cache miss, then capture whatever the controller produces on its way out the door, transparently, without the controller needing any awareness that caching exists.

### Cache Invalidation

Whenever a product is created, updated, or deleted, the corresponding controller calls:

```javascript
await invalidateCache("/api/v1/products*");
```

which runs a Redis `KEYS` scan for anything matching `cache:/api/v1/products*` and deletes all matches. This guarantees that after any write, the very next GET request is forced to be a cache MISS and fetches fresh data from PostgreSQL — preventing the classic "I updated the price but the API still shows the old one for 5 minutes" bug.

**Known limitation (acceptable for this project's scale):** `KEYS` is O(n) and would be a poor choice at very large scale (better replaced with Redis `SCAN` or tagged cache sets in a high-traffic production system) — but for this project's purposes it's simple, correct, and fast enough, and choosing it deliberately over a more complex solution is itself a reasonable engineering tradeoff to be able to articulate.

---

## How Rate Limiting Works

**Location:** `src/middlewares/rateLimit.middleware.js`

Two separate limiter instances, both using an in-memory store (resets on server restart — acceptable for a single-instance deployment; a multi-instance production deployment would need a shared store like Redis, which is a natural extension point to mention in interviews):

- **`generalLimiter`** — applied globally in `index.js` via `app.use(generalLimiter)`, so it runs on every single request regardless of route. Caps any one IP at 100 requests per 15-minute window.
- **`authLimiter`** — applied specifically to `/register` and `/login` only, much stricter at 5 requests per 15-minute window. This exists specifically to slow down brute-force password guessing attempts against login — an attacker gets 5 tries per 15 minutes per IP before being blocked, regardless of how many different passwords they attempt against the general endpoint.

Both use `standardHeaders: true` (returns `RateLimit-*` response headers so clients can see their remaining quota) and `legacyHeaders: false` (disables the older `X-RateLimit-*` header format).

**Practical note for testing:** Because the smoke test exercises the auth endpoints multiple times per run, running `npm run smoke` more than 5 times within a 15-minute window will start hitting `authLimiter` and cause those specific tests to fail with 429 instead of the expected status — this is the rate limiter working correctly, not a bug. Restarting the server clears the in-memory limiter state immediately if you need to test again sooner.

---

## How API Versioning Works

**Location:** `src/index.js`

```javascript
const API_VERSION = "/api/v1";
app.use(API_VERSION, testRoutes);
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/products`, productRoutes);
app.use(`${API_VERSION}/inventory`, inventoryRoutes);
app.use(`${API_VERSION}/orders`, orderRoutes);
```

**Why this matters:** If a breaking change is ever needed (e.g. changing the shape of the Order response), a `/api/v2/orders` route can be introduced that coexists with `/api/v1/orders` — existing clients (or in this case, the existing smoke test / frontend) keep working against v1 while new functionality is built and tested under v2, with an explicit, deliberate migration path rather than a breaking change landing on everyone at once. This is standard practice at any company with external API consumers.

**A real bug this caused and the fix (worth remembering):** When versioning was first introduced, `invalidateCache('/api/products*')` calls inside the product controller were NOT updated to match the new `/api/v1/products*` cache key prefix, since the cached keys themselves are built from `req.originalUrl` (which now correctly includes `/v1`). This meant cache invalidation silently stopped matching anything, and updates appeared to "not take effect" — the smoke test caught this immediately via the "Cache invalidates after update" check failing with a stale price. Fixed by updating the invalidation pattern string in three places (create/update/delete) to include `/v1`. This is a good real example of why the automated cache-invalidation test exists — it caught a subtle bug that manual testing easily could have missed (since the cache would have still eventually expired after 5 minutes, masking the bug in casual testing).

---

## How Distributed Locking Works (Order Creation)

**Location:** `src/utils/lock.js`, consumed by `src/services/order.service.js`

### The Problem It Solves

Two customers requesting the last unit of a product at the exact same instant could both read `available: 1`, both pass the stock-sufficiency check, and both get an order created — overselling something you only had one of. A lock forces these two requests to be handled one at a time for that specific product, so the second request always sees the _result_ of the first, never a stale simultaneous read.

### The Mechanism

**Acquiring:**

```javascript
await redisClient.set(lockKey, token, { NX: true, PX: ttlMs });
```

This compiles to the Redis command `SET lock:product:{id} {token} NX PX 5000`:

- **NX** ("set if Not eXists") is the atomicity guarantee — Redis processes commands one at a time internally (single-threaded event loop for command execution), so there is no possible window where two concurrent `SET ... NX` calls for the same key both succeed. Exactly one wins; the other gets a null result and must retry.
- **PX 5000** auto-expires the lock after 5000ms. This is the safety net against a crashed or hung process holding a lock forever — if the server dies mid-order (deploy, crash, uncaught exception) while holding a lock, that lock self-destructs after 5 seconds instead of permanently blocking that product.
- **token** is a fresh `crypto.randomUUID()` generated per lock attempt — not a shared constant. This is what makes safe release possible (see below).

**Retry loop:** If the lock is currently held, `acquireLock` retries every 100ms for up to 20 attempts (2 seconds total) before giving up and returning `null`. The order service treats a `null` return as `LOCK_TIMEOUT` and responds to the client with a 409, meaning "the system is genuinely busy on this exact product right now, please retry" — this is a legitimate, expected response under real contention, not an error condition.

**Releasing (via Lua script for atomicity):**

```lua
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
```

This check-then-delete has to be a single atomic operation (hence Lua, which Redis executes as one indivisible unit), not two separate Redis calls from Node, because a GET-then-DEL done as two separate round trips has its own race condition: between the GET and the DEL, the lock could expire and get re-acquired by someone else, and a naive DEL would then delete a lock that isn't yours anymore.

**Why the token check matters concretely:** Imagine Alice's operation runs long and her lock's 5-second PX expires while she's still working. Redis auto-deletes it. Bob then successfully acquires a _new_ lock with his own fresh token. If Alice's slow process finally finishes and blindly calls `DEL lock:product:xyz` without checking ownership, it would delete **Bob's** active lock, letting a third request barge in while Bob still believes he's protected. Checking the token first prevents this exact scenario.

### Deadlock Prevention

Order creation can include multiple different products in one request. All their locks are acquired in **sorted productId order**, not the order they happen to appear in the request body:

```javascript
const sortedProductIds = [...new Set(items.map((i) => i.productId))].sort();
```

**Why this matters:** If Order A wants products `[X, Y]` and Order B wants `[Y, X]`, and each acquires locks in the order given, Order A could grab X while Order B grabs Y simultaneously — then both wait forever for the other's lock (a classic deadlock, the same category of bug that causes database deadlocks in any system with multi-resource locking). Sorting guarantees every single order request, regardless of how the client listed items, attempts to acquire locks in the exact same global order — X before Y, always — which makes the circular-wait condition structurally impossible.

### Terminology Precision: This Is Not "Redlock"

The formal **Redlock algorithm**, as originally proposed by Redis's creator, is specifically designed for coordinating a lock across **multiple independent Redis master nodes** (typically 5), requiring a majority quorum to agree a lock is validly held — built to survive a single Redis node crashing or a network partition in a distributed Redis deployment. This project runs a single local Redis instance, so true multi-node Redlock doesn't apply here and shouldn't be claimed as what's implemented.

What's actually built — atomic `SET NX PX` acquisition + token-verified atomic release — is the same underlying primitive that Redlock is built on top of. This exact pattern (single-instance, not multi-node) is what most real companies actually use in practice for this kind of problem, typically with a Redis replica for failover rather than a full multi-master quorum setup. Being precise about this distinction in an interview (rather than overclaiming "I implemented Redlock") is itself a signal of genuine understanding rather than keyword-matching.

---

## How Idempotency Works (Order Creation)

**Location:** `src/services/order.service.js`, inside `createOrder`

**The problem it solves:** A user double-clicks "Place Order." Or their network is flaky and the client retries a request that actually succeeded server-side but the response never made it back. Without protection, either scenario creates two separate orders and reserves stock twice for what the user intended as a single action.

**The mechanism:** Every order request must include a client-generated `idempotencyKey` — a unique string per checkout _attempt_ (in a real frontend, typically a UUID generated once when the checkout button is first clicked, and reused automatically if the request needs to be retried). Before doing anything else — before even attempting to acquire a lock — the service checks whether this exact key has been seen before:

```javascript
const existingOrder = await prisma.order.findUnique({
  where: { idempotencyKey },
});
if (existingOrder) {
  return { order: existingOrder, isNew: false };
}
```

If found, the existing order is returned immediately with a 200 status (not 201, signaling "this already existed, here it is again" rather than "just created") — no new order, no additional stock reservation, completely safe to call this endpoint multiple times with the same key.

**Why this check runs before locking, and what the real safety net is:** This check is a plain read against a database column with a `@unique` constraint (`idempotencyKey String @unique` in the Prisma schema) — it doesn't need coordination/locking on its own. The actual airtight guarantee against a race (two identical requests with the same key arriving at literally the same instant, both passing this initial check before either has written anything) is PostgreSQL's own unique constraint: if that edge case occurred, one insert would succeed and the second would fail with a unique constraint violation at the database level, which is the true final backstop beneath the earlier application-level check.

---

## Order State Machine (Detailed)

**Location:** `src/services/order.service.js`, `ALLOWED_TRANSITIONS`

```
PENDING → CONFIRMED → SHIPPED → DELIVERED
    ↓
CANCELLED (only reachable from PENDING or CONFIRMED)
```

```javascript
const ALLOWED_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
```

`updateOrderStatus` looks up the order's current status, checks whether the requested new status is in that status's allowed-transitions array, and rejects with a 400 (`INVALID_TRANSITION:{current}:{requested}`) before touching the database at all if the transition isn't legal. This makes impossible states — like an order jumping straight from PENDING to DELIVERED without ever being confirmed or shipped — structurally unrepresentable in the system, rather than something that has to be guarded against by careful frontend logic or hoped never happens.

**Inventory side effects, per transition — this is the two-phase stock accounting design:**

| Transition              | `quantity`    | `reserved`    | Why                                                                                                                           |
| ----------------------- | ------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Order created → PENDING | unchanged     | **+quantity** | Stock is "held" for this order but not yet permanently committed — this is what the distributed lock protects during creation |
| → CONFIRMED             | **−quantity** | **−quantity** | Stock is now permanently deducted; the reservation "converts" into a real deduction                                           |
| PENDING → CANCELLED     | unchanged     | **−quantity** | Release the hold; nothing was ever actually deducted, so nothing needs to be added back to `quantity`                         |
| → SHIPPED, → DELIVERED  | unchanged     | unchanged     | No inventory impact — the deduction already happened at CONFIRMED                                                             |

**Why reserve-then-confirm instead of just deducting immediately on order creation:** If stock were deducted the instant an order is created (while still PENDING, before payment/confirmation), a customer who creates an order but never completes payment would still be occupying real inventory indefinitely. The two-phase approach means stock is _held_ (visible to other customers as unavailable, preventing overselling) without being _permanently spent_ until the order is actually confirmed — and if it's cancelled instead, the hold cleanly releases with zero side effects on real inventory levels.

## API Design Patterns Implemented

### Public vs Protected Routes Strategy:

**Design Decision:** Catalog browsing should be public, management should be protected

**Public Routes (No Authentication):**

- `GET /api/products` - Browse catalog
- `GET /api/products/:id` - View product details
- `GET /api/inventory/product/:id` - Check stock availability

**Rationale:**

- E-commerce sites don't require login to browse
- Reduces friction for customers
- Stock visibility builds trust (shows product is available)

**Protected Routes (Authentication Required):**

- All routes that modify data
- All routes that access user-specific information

**Admin-Only Routes (Authentication + Role Check):**

- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PUT /api/inventory/product/:id` - Set stock
- `POST /api/inventory/product/:id/add` - Add stock
- `GET /api/inventory/low-stock` - View reorder alerts

**Rationale:**

- Only store managers should modify catalog
- Prevents customers from deleting products or manipulating stock
- Clear separation of concerns

### HTTP Status Codes (Industry Standard):

**2xx Success:**

- `200 OK` - Successful GET/PUT/DELETE
- `201 Created` - Successful POST (resource created)

**4xx Client Errors:**

- `400 Bad Request` - Invalid input (negative price, missing required fields)
- `401 Unauthorized` - No token OR invalid/expired token
- `403 Forbidden` - Valid token but insufficient permissions (CUSTOMER trying admin action)
- `404 Not Found` - Resource doesn't exist (product ID not in database)

**5xx Server Errors:**

- `500 Internal Server Error` - Database connection failed, unexpected error

**Why these matter:**

- Frontend can handle errors differently based on status
- 401 → redirect to login
- 403 → show "You don't have permission"
- 404 → show "Product not found"
- Industry standard - any developer knows what these mean

### Error Handling Pattern:

**Consistent structure across all controllers:**

```javascript
async function someOperation(req, res) {
  try {
    // Database operation
    const result = await prisma.model.operation(...);
    res.json(result);
  } catch (error) {
    // Check for specific Prisma errors
    if (error.code === 'P2025') {  // Record not found
      return res.status(404).json({ error: 'Resource not found' });
    }
    if (error.code === 'P2002') {  // Unique constraint violation
      return res.status(400).json({ error: 'Already exists' });
    }

    // Log unexpected errors for debugging
    console.error('Operation error:', error);

    // Generic error response (don't expose internal details)
    res.status(500).json({ error: 'Operation failed' });
  }
}
```

**Key Prisma Error Codes:**

- `P2025` - Record not found (wrong ID in WHERE clause)
- `P2002` - Unique constraint violation (duplicate email, etc.)
- `P2003` - Foreign key constraint failed (referencing non-existent ID)

**Why log errors:**

- `console.error()` prints to server console for debugging
- In production, these go to log aggregation tools (CloudWatch, Datadog)
- Helps diagnose issues without exposing internals to users

### Input Validation (Current Status):

**Currently:** Basic validation in controllers

```javascript
if (price <= 0) {
  return res.status(400).json({ error: "Price must be greater than 0" });
}
```

**Phase 1 Week 2 TODO:** Add express-validator middleware for comprehensive validation

- Email format
- Password strength
- Required fields
- Data types
- String length limits

---

## Next Steps (Immediate)

**Phase 3 starts now — Docker, CI/CD, and deployment:**

1. **Dockerfile** — multi-stage build: install dependencies in a build stage, copy source, run `npx prisma generate`, expose port 3000, start with `node src/index.js` (not nodemon — nodemon is dev-only)

2. **docker-compose.yml** — three services: `api` (built from the Dockerfile), `postgres` (official postgres image, volume-mounted for persistence), `redis` (official redis image). This replaces the manual `sudo service postgresql start` / `sudo service redis-server start` routine with a single `docker-compose up` — genuinely useful going forward, not just for the resume checkbox.

3. **`.github/workflows/ci.yml`** — GitHub Actions pipeline triggered on every push: checkout code → install Node → `npm install` → spin up Postgres + Redis as service containers → run `npx prisma migrate deploy` → run `npm test` → run `npm run smoke` → fail the build red if either test suite fails. This is what makes the automated tests actually mean something beyond "I ran them once locally."

4. **Railway deployment** — connect the GitHub repo directly (Railway auto-deploys on push once connected), provision a Postgres and Redis instance through Railway's own offerings (or point at the same connection strings if self-managing), set `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `NODE_ENV=production` as Railway environment variables (never committed to the repo).

5. **Post-deploy verification** — point `smoke-test.js`'s `BASE_URL` constant at the live Railway URL (via an environment variable override, not a hardcoded change) and run it against production to confirm the deployed instance actually behaves identically to local — this closes the loop and proves the project isn't just "works on my machine."

---

## Restart Instructions (After Complete Wipeout)

If everything crashes or you need to restart from scratch:

### 1. Environment Setup

```bash
# Open Ubuntu terminal
sudo service postgresql start
sudo service redis-server start
cd ~/stocksync
npm install
```

### 2. Database Reset (if needed)

```bash
# Delete and recreate database
sudo -u postgres psql
DROP DATABASE stocksync;
CREATE DATABASE stocksync;
\q

# Run migrations
npx prisma migrate deploy
npx prisma generate
```

### 3. Start Server

```bash
npm run dev
# Server runs on http://localhost:3000
```

### 4. Open VS Code

```bash
code .
# Or from Windows: Ctrl+Shift+P → "WSL: Connect to WSL"
```

### 5. Verify Everything Works

- Visit http://localhost:3000/health (should return ok)
- Visit http://localhost:3000/api/db-test (should connect to DB)
- Run register + login requests from test.http file

---

## Common Issues & Fixes

**Prisma migration fails:**

```bash
# Give user permission to create databases
sudo -u postgres psql
ALTER USER akarsh CREATEDB;
\q
```

**Can't connect to PostgreSQL:**

```bash
sudo service postgresql status  # Check if running
sudo service postgresql start   # Start if stopped
```

**Can't connect to Redis:**

```bash
redis-cli ping  # Should return PONG
sudo service redis-server start
```

**Server won't start:**

```bash
# Check if port 3000 is already in use
lsof -i :3000
kill -9 <PID>  # Kill the process if needed
```

**VS Code won't connect to WSL:**

```bash
# Install WSL extension in VS Code
# Then: Ctrl+Shift+P → "WSL: Connect to WSL using Distro" → Ubuntu-22.04
```

---

## Important Concepts Explained

### Why Bcrypt for Passwords?

- One-way hash (can't decrypt)
- Includes salt (same password = different hash each time)
- Computationally expensive (slows down brute force attacks)
- Industry standard (used by major companies)

### Why JWT for Auth?

- Stateless (server doesn't store sessions)
- Self-contained (all info in the token)
- Scales horizontally (any server can verify)
- Expires automatically (7 day timeout)

### Why Prisma ORM?

- Type-safe queries (catches errors before runtime)
- Auto-generates types from schema
- Handles migrations automatically
- Prevents SQL injection by default

### Why Separate Inventory from Product?

- Products are read-heavy (browsing catalog)
- Inventory is write-heavy (concurrent orders)
- Separating allows different caching strategies
- Enables optimistic locking on inventory only

---

## Roadmap Checklist

**Phase 1 — Complete:**

- [x] Environment setup (WSL2, Node, PostgreSQL, Redis)
- [x] Project structure created (MVC pattern)
- [x] Prisma schema defined with all 5 models
- [x] Database migrated
- [x] Auth system (register, login, JWT, bcrypt)
- [x] Auth middleware (authenticate + requireAdmin)
- [x] Product CRUD (all 5 operations, role-gated)
- [x] Inventory management (get, set, add, low-stock)
- [x] Transaction safety (product + inventory created atomically)
- [x] Input validation (express-validator, centralized rule sets)
- [x] Redis caching with automatic invalidation on writes
- [x] Rate limiting (general 100/15min + strict auth 5/15min)
- [x] API versioning (/api/v1/\*)
- [x] Unit tests (13 checks: password, JWT, auth middleware)
- [x] Automated smoke test built (initially 16 checks, since expanded)
- [x] Git initialized, renamed project to Invarion, pushed to GitHub

**Phase 2 — Complete:**

- [x] Distributed lock utility (Redis SET NX PX + Lua-scripted safe release)
- [x] Deadlock prevention via sorted lock acquisition order
- [x] Order creation endpoint with real stock reservation
- [x] Idempotency key handling (unique constraint + pre-check)
- [x] Order state machine with enforced legal transitions only
- [x] Two-phase stock accounting (reserve on create, deduct on confirm, release on cancel)
- [x] Order status update endpoint (ADMIN only, validated)
- [x] Own-orders and single-order fetch endpoints with ownership/ADMIN authorization
- [x] Smoke test expanded to 23 checks, including the concurrent-order race test proving no overselling under real simultaneous requests

**Phase 3 — Next (Docker + CI/CD + Deployment):**

- [ ] Dockerfile for the API (multi-stage build)
- [ ] docker-compose.yml for local dev (API + Postgres + Redis as one command, replacing manual `sudo service` startup)
- [ ] GitHub Actions workflow — lint, `npm test`, `npm run smoke` (against a spun-up test DB/Redis in CI), fail build on any failure
- [ ] Railway deployment — connect repo, configure DATABASE_URL/REDIS_URL/JWT_SECRET as Railway environment secrets
- [ ] Post-deploy verification — run smoke test against the live Railway URL

**Phase 4 — Later (PulseNotify capstone — separate standalone project):**

- [ ] Not started. Planned: distributed notification service with exactly-once delivery, Kafka event ingestion, multi-channel delivery (email/webhook/in-app), dead letter queue with exponential backoff retry, per-channel rate limiting, delivery analytics dashboard.

---

## Git Commit History (Recommended Structure)

**Initial Setup Commits:**

```bash
# 1. Gitignore (prevents committing secrets)
git init
git add .gitignore
git commit -m "Initial commit: Add gitignore"

# 2. Dependencies
git add package.json package-lock.json
git commit -m "Add project dependencies

- express, cors, helmet, morgan for API server
- prisma, @prisma/client, @prisma/adapter-pg for database
- bcryptjs, jsonwebtoken for authentication
- nodemon, jest, supertest for development and testing"

# 3. Database schema
git add prisma/
git commit -m "Add Prisma schema and initial migration

Models:
- User (auth, role-based access)
- Product (catalog)
- Inventory (stock management with optimistic locking)
- Order (order state machine)
- OrderItem (order line items)

Key features:
- UUID primary keys for security
- Decimal for money (not Float)
- Idempotency keys for orders
- Reserved stock for concurrent order handling"

# 4. Configuration
git add src/config/
git commit -m "Add database connection configuration

- Prisma client with PrismaPg adapter
- Connection pooling
- Query logging in development"

# 5. Utilities
git add src/utils/
git commit -m "Add authentication utilities

- JWT token generation and verification (7 day expiry)
- Bcrypt password hashing (10 salt rounds)
- Constant-time password comparison"

# 6. Middleware
git add src/middlewares/
git commit -m "Add authentication middleware

- JWT token verification from Authorization header
- User role checking (ADMIN vs CUSTOMER)
- Request object augmentation with user data"

# 7. Auth endpoints
git add src/controllers/auth.controller.js src/routes/auth.routes.js
git commit -m "Implement user registration and login

Endpoints:
- POST /api/auth/register (creates user, returns JWT)
- POST /api/auth/login (verifies credentials, returns JWT)

Features:
- Duplicate email prevention
- Password hashing before storage
- JWT tokens with user metadata"

# 8. Product endpoints
git add src/controllers/product.controller.js src/routes/product.routes.js
git commit -m "Implement product CRUD operations

Endpoints:
- GET /api/products (public)
- GET /api/products/:id (public)
- POST /api/products (ADMIN only)
- PUT /api/products/:id (ADMIN only)
- DELETE /api/products/:id (ADMIN only)

Features:
- Atomic product + inventory creation via transaction
- Cascade delete (inventory deleted with product)
- Include inventory data in responses"

# 9. Inventory endpoints
git add src/controllers/inventory.controller.js src/routes/inventory.routes.js
git commit -m "Implement inventory management

Endpoints:
- GET /api/inventory/product/:id (public, check stock)
- PUT /api/inventory/product/:id (ADMIN, set absolute stock)
- POST /api/inventory/product/:id/add (ADMIN, increment stock)
- GET /api/inventory/low-stock (ADMIN, reorder alerts)

Features:
- Available stock calculation (quantity - reserved)
- Version field increment for optimistic locking
- Low stock threshold filtering"

# 10. Server entry point
git add src/index.js
git commit -m "Add Express server configuration

Middleware:
- helmet (security headers)
- cors (cross-origin requests)
- morgan (request logging)
- express.json (JSON body parsing)

Routes:
- /health (health check)
- /api/auth (authentication)
- /api/products (product CRUD)
- /api/inventory (stock management)"

# 11. Test suite
git add test.http
git commit -m "Add REST Client test collection

Complete test coverage for:
- Auth (register, login, token validation)
- Products (CRUD, public vs admin access)
- Inventory (stock operations, low stock alerts)
- Error cases (401, 403, 404)"

# 12. Documentation
git add PROJECT_CHECKPOINT.md README.md
git commit -m "Add project documentation

- Complete checkpoint file for recovery
- Setup instructions
- API documentation
- Architecture decisions
- Troubleshooting guide"
```

**After Initial Setup (Incremental Commits):**

```bash
# Feature commits (one per feature)
git add src/middlewares/validation.middleware.js
git commit -m "Add input validation middleware with express-validator"

git add src/config/redis.js src/middlewares/cache.middleware.js
git commit -m "Implement Redis caching for product endpoints"

git add src/middlewares/rateLimit.middleware.js
git commit -m "Add rate limiting (100 req/15min general, 5 req/15min auth)"

# Refactor commits
git add src/routes/*.js src/index.js
git commit -m "Refactor: Add API versioning (v1)"

# Test commits
git add tests/unit/
git commit -m "Add unit tests for auth utilities and middleware"

git add tests/integration/
git commit -m "Add integration tests for product and inventory endpoints"

# Documentation commits
git add README.md
git commit -m "Update README with cache invalidation strategy"
```

**Phase 1 completion commits (validation, caching, rate limiting, versioning, testing):**

```bash
git add src/config/redis.js src/middlewares/cache.middleware.js src/middlewares/validation.middleware.js src/middlewares/validators.js src/routes scripts/smoke-test.js package.json
git commit -m "feat: add input validation, Redis caching, and automated smoke tests"

git add src/middlewares/rateLimit.middleware.js src/routes/auth.routes.js src/index.js
git commit -m "feat: add rate limiting (general 100/15min, auth 5/15min)"

git add -A
git commit -m "feat: add API versioning (v1), fix cache invalidation pattern"

git add tests/ jest.setup.js package.json
git commit -m "test: add unit tests for password, jwt, and auth middleware utilities"
```

**Phase 2 — Order system commits:**

```bash
git add src/services src/controllers/order.controller.js src/routes/order.routes.js src/utils/lock.js src/middlewares/validators.js src/index.js scripts/smoke-test.js
git commit -m "feat: implement order system with distributed locking, idempotency, and state machine

- Redis-based distributed lock (SET NX PX + Lua safe release)
- Deadlock prevention via sorted product ID lock acquisition
- Idempotency key check prevents duplicate orders on retry
- Order state machine enforces legal status transitions only
- Two-phase stock accounting: reserve on create, deduct on confirm
- Smoke test expanded to 23 checks including concurrent order race test
  that proves no overselling occurs under real simultaneous requests"
```

**Commit Message Format:**
<type>: <subject>

<body (optional)> <footer (optional)> ````

Types:

feat: New feature
fix: Bug fix
refactor: Code change that neither fixes bug nor adds feature
test: Adding or updating tests
docs: Documentation only
chore: Maintenance (dependencies, configs)

---

## Contact & Questions

If resuming this project after a break, read this file top to bottom. It contains everything needed to understand the current state and continue building.

```markdown
**Current blocker:** None — Phase 2 (Order system) fully complete and tested  
**Last successful test:** All 23 smoke test checks passing, including the concurrent-order race test (proves no overselling under real simultaneous load)  
**Next file to create:** `Dockerfile` and `docker-compose.yml` for Phase 3  
**Current phase completion:** Phase 1 ✅ Complete | Phase 2 ✅ Complete | Phase 3 (Docker/CI-CD/Deploy) starting now
```
