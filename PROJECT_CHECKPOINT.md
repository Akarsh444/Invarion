# StockSync Project Checkpoint

**Last Updated:** May 16, 2026  
**Phase:** Phase 1 Week 1 - Auth & Product APIs (In Progress)  
**Status:** Auth system complete, moving to Product CRUD

---

## Project Overview

**Project Name:** StockSync - Concurrent Inventory & Order Engine  
**Goal:** Production-grade backend system demonstrating concurrent inventory management with distributed locking, idempotency, and exactly-once semantics.

**Timeline:** 10 weeks total (started Week 1)  
**Daily Time Investment:** 2.5-3 hours

---

## Tech Stack (LOCKED - DO NOT CHANGE)

- **Runtime:** Node.js 22.22.2
- **Framework:** Express.js
- **Database:** PostgreSQL 16 (via Prisma ORM v7)
- **Cache:** Redis
- **Auth:** JWT + bcrypt
- **Testing:** Jest + Supertest (not yet implemented)
- **Containerization:** Docker (not yet implemented)
- **CI/CD:** GitHub Actions (not yet implemented)
- **Deployment:** Railway (not yet implemented)
- **Dev Tools:** nodemon, ESLint, Prettier, REST Client

---

## Environment Details

**Operating System:** Windows 11 with WSL2 (Ubuntu 22.04)  
**User:** akarsh  
**Project Location:** `/home/akarsh/stocksync`

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

stocksync/
├── src/
│ ├── config/
│ │ └── db.js # Prisma client with PrismaPg adapter
│ ├── controllers/
│ │ ├── auth.controller.js # Register, login logic
│ │ ├── product.controller.js # Product CRUD operations
│ │ └── inventory.controller.js # Stock management operations
│ ├── middlewares/
│ │ └── auth.middleware.js # JWT verification + role checking
│ ├── models/ # (Prisma schema handles this)
│ ├── routes/
│ │ ├── auth.routes.js # POST /api/auth/register, /login
│ │ ├── test.routes.js # GET /api/db-test
│ │ ├── product.routes.js # Product CRUD routes
│ │ └── inventory.routes.js # Inventory management routes
│ ├── services/ # (empty - business logic coming in Phase 3)
│ ├── utils/
│ │ ├── jwt.js # generateToken, verifyToken
│ │ └── password.js # hashPassword, comparePassword
│ └── index.js # Express app entry point
├── prisma/
│ ├── schema.prisma # Database schema
│ ├── migrations/ # SQL migration files (auto-generated)
│ │ └── 20260512163559_init/
│ │ └── migration.sql
│ └── prisma.config.ts # Prisma v7 config with PrismaPg adapter
├── tests/ # (empty - testing coming in Phase 2)
│ ├── unit/ # Unit tests for controllers/services
│ └── integration/ # Integration tests for API endpoints
├── .env # Environment variables (NOT in Git)
├── .gitignore # node_modules, .env, dist, logs
├── package.json # Dependencies and scripts
├── test.http # REST Client test requests
└── PROJECT_CHECKPOINT.md # This file - complete project state

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

- express
- dotenv
- cors
- helmet
- morgan
- prisma
- @prisma/client
- @prisma/adapter-pg
- bcryptjs
- jsonwebtoken

**Dev:**

- nodemon
- jest
- supertest
- eslint
- prettier
- typescript
- ts-node
- @types/node
- @types/bcryptjs
- @types/jsonwebtoken

---

## What's Working Right Now

### Endpoints Implemented & Tested

**System Health:**

```http
GET http://localhost:3000/health
Response: { "status": "ok", "message": "StockSync API running" }
```

**Database Connection Test:**

```http
GET http://localhost:3000/api/db-test
Response: { "message": "Database connected", "userCount": 2 }
```

**Authentication Endpoints:**

_Register New User:_

```http
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "role": "CUSTOMER"  // or "ADMIN"
}

Response 201:
{
  "user": {
    "id": "01732e77-3e4c-4938-9f6f-754668b9dee1",
    "email": "user@example.com",
    "role": "CUSTOMER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

_Login Existing User:_

```http
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response 200:
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Product Endpoints:**

_List All Products (Public - No Auth):_

```http
GET http://localhost:3000/api/products

Response 200:
[
  {
    "id": "uuid",
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": "75000",
    "createdAt": "2026-05-16T...",
    "updatedAt": "2026-05-16T...",
    "inventory": {
      "id": "uuid",
      "productId": "uuid",
      "quantity": 10,
      "reserved": 0,
      "version": 1
    }
  }
]
```

_Get Single Product (Public - No Auth):_

```http
GET http://localhost:3000/api/products/{productId}

Response 200: (same structure as above, single object)
Response 404: { "error": "Product not found" }
```

_Create Product (ADMIN Only):_

```http
POST http://localhost:3000/api/products
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": 75000,
  "initialStock": 10
}

Response 201:
{
  "id": "uuid",
  "name": "Laptop",
  "description": "High-performance laptop",
  "price": "75000",
  "createdAt": "2026-05-16T...",
  "updatedAt": "2026-05-16T..."
}

Response 401: { "error": "No token provided" } (if no auth header)
Response 403: { "error": "Admin access required" } (if CUSTOMER token)
Response 400: { "error": "Price must be greater than 0" } (if invalid price)
```

_Update Product (ADMIN Only):_

```http
PUT http://localhost:3000/api/products/{productId}
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "name": "Updated Laptop",
  "price": 72000
}

Response 200: (updated product object)
Response 404: { "error": "Product not found" }
```

_Delete Product (ADMIN Only):_

```http
DELETE http://localhost:3000/api/products/{productId}
Authorization: Bearer {admin_token}

Response 200: { "message": "Product deleted successfully" }
Response 404: { "error": "Product not found" }
```

**Inventory Endpoints:**

_Get Inventory for Product (Public - No Auth):_

```http
GET http://localhost:3000/api/inventory/product/{productId}

Response 200:
{
  "id": "uuid",
  "productId": "uuid",
  "quantity": 50,
  "reserved": 0,
  "version": 1,
  "updatedAt": "2026-05-16T...",
  "available": 50,  // calculated: quantity - reserved
  "product": {
    "id": "uuid",
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": "75000"
  }
}

Response 404: { "error": "Inventory not found" }
```

_Update Stock Quantity - Set Absolute Value (ADMIN Only):_

```http
PUT http://localhost:3000/api/inventory/product/{productId}
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "quantity": 50
}

Response 200:
{
  "id": "uuid",
  "productId": "uuid",
  "quantity": 50,  // now exactly 50, regardless of previous value
  "reserved": 0,
  "version": 2,  // incremented
  "available": 50,
  "product": { ... }
}

Response 400: { "error": "Quantity cannot be negative" }
Response 404: { "error": "Inventory not found" }
```

_Add Stock - Increment Existing (ADMIN Only):_

```http
POST http://localhost:3000/api/inventory/product/{productId}/add
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "amount": 20
}

Response 200:
{
  "quantity": 70,  // was 50, now 70 (50 + 20)
  "reserved": 0,
  "version": 3,
  "available": 70,
  "message": "Added 20 units to stock",
  "product": { ... }
}

Response 400: { "error": "Amount must be greater than 0" }
```

_Get Low Stock Products (ADMIN Only):_

```http
GET http://localhost:3000/api/inventory/low-stock?threshold=10
Authorization: Bearer {admin_token}

Response 200:
[
  {
    "id": "uuid",
    "productId": "uuid",
    "quantity": 5,
    "reserved": 0,
    "available": 5,  // 5 < 10, so included
    "product": { ... }
  }
]
```

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

**Tomorrow (May 17, 2026):**

1. **Test inventory endpoints end-to-end:**
   - Create fresh product with initial stock
   - Verify inventory created automatically
   - Test addStock (increment operation)
   - Test updateStock (absolute set operation)
   - Test getLowStock with different thresholds
   - Verify version field increments on each update

2. **Initialize Git repository:**

```bash
   cd ~/stocksync
   git init
   git add .gitignore
   git commit -m "Initial commit: Add gitignore"

   git add package.json package-lock.json
   git commit -m "Add dependencies"

   git add prisma/
   git commit -m "Add Prisma schema and migrations"

   git add src/config src/utils
   git commit -m "Add database connection and utility functions"

   git add src/middlewares
   git commit -m "Add authentication middleware"

   git add src/controllers src/routes src/index.js
   git commit -m "Add auth, product, and inventory endpoints"

   git add test.http PROJECT_CHECKPOINT.md
   git commit -m "Add test suite and project documentation"
```

3. **Add input validation** (express-validator):
   - Install: `npm install express-validator`
   - Create `src/middlewares/validation.middleware.js`
   - Add validators for:
     - Email format (must be valid email)
     - Password strength (min 8 chars, 1 number, 1 uppercase)
     - Product name (required, 1-200 chars)
     - Price (required, must be positive number)
     - Stock quantity (must be non-negative integer)
   - Apply to all POST/PUT routes

**Week 1 Remaining (May 18-19, 2026):** 4. **Implement Redis caching:**

- Install: `npm install redis`
- Create `src/config/redis.js` connection
- Cache product list (TTL: 5 minutes)
- Cache single product lookups (TTL: 10 minutes)
- Invalidate cache on product create/update/delete
- Add cache hit/miss logging

5. **Add rate limiting:**
   - Install: `npm install express-rate-limit`
   - General API: 100 requests per 15 minutes per IP
   - Auth endpoints: 5 requests per 15 minutes per IP (prevent brute force)
   - Return 429 status with Retry-After header

6. **API versioning:**
   - Rename all routes from `/api/*` to `/api/v1/*`
   - Update `src/index.js` route mounting
   - Update all tests in `test.http`
   - Prepare structure for v2 (future breaking changes)

7. **Write first unit tests:**
   - Test `hashPassword` and `comparePassword` utilities
   - Test `generateToken` and `verifyToken` utilities
   - Test auth middleware with valid/invalid/expired tokens
   - Test requireAdmin middleware with ADMIN/CUSTOMER roles

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

## Phase 1 Complete Checklist

**Week 1 Progress:**

- [x] Environment setup (WSL2, Node, PostgreSQL, Redis)
- [x] Project structure created (MVC pattern)
- [x] Prisma schema defined with all models
- [x] Database migrated (all tables created)
- [x] Auth system (register + login with JWT)
- [x] Auth middleware (authenticate + requireAdmin)
- [x] Product CRUD endpoints (all 5 operations)
- [x] Inventory management endpoints (get, set, add, low-stock)
- [x] Transaction safety (product + inventory created atomically)
- [x] Role-based access control (ADMIN vs CUSTOMER)
- [x] Complete REST Client test collection in test.http

**Week 2 TODO:**

- [ ] Test inventory endpoints thoroughly
- [ ] Add input validation middleware (express-validator)
- [ ] Implement Redis caching for product list
- [ ] Implement Redis caching for single product lookups
- [ ] Add rate limiting (express-rate-limit)
- [ ] API versioning (/api/v1/\* pattern)
- [ ] Error logging middleware
- [ ] Request ID tracking
- [ ] Unit tests for utilities (jwt, password)
- [ ] Unit tests for controllers
- [ ] Integration tests for API endpoints
- [ ] Initialize Git repository
- [ ] First commits with proper commit messages
- [ ] README with setup instructions

**Week 3 TODO (Order System):**

- [ ] Order creation endpoint with stock reservation
- [ ] Distributed locking with Redis (Redlock)
- [ ] Idempotency key validation
- [ ] Order state machine implementation
- [ ] Order status update endpoints
- [ ] Reserved stock management

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
**Current blocker:** None - inventory endpoints implemented, need testing tomorrow  
**Last successful test:** Product CRUD fully functional with auth protection  
**Next file to create:** `src/middlewares/validation.middleware.js` (input validation) OR `src/config/redis.js` (caching setup)  
**Current phase completion:** Week 1 ~80% complete (auth + product + inventory done, caching + validation + tests remaining)
```
