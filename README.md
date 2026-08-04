# Invarion

**A concurrent inventory & order engine that guarantees no overselling under simultaneous load.**

Live API: **https://invarion.onrender.com** &nbsp;·&nbsp; Health check: [`/health`](https://invarion.onrender.com/health)

> Note: the demo runs on a free tier that sleeps after inactivity — the first request may take ~30–60s to wake the service, then responds normally.

---

## What this is

Invarion is a backend system for inventory and order management, built to solve one specific hard problem correctly: **when two customers try to buy the last unit of a product at the exact same moment, exactly one succeeds and stock is never oversold.**

That guarantee is enforced with a Redis-based distributed lock, idempotency keys, an order state machine, and two-phase stock accounting — and it's proven by an automated test that fires concurrent order requests and asserts the final inventory is consistent.

This is not a CRUD tutorial app. The focus is depth on a real distributed-systems problem, deployed to live cloud infrastructure with CI/CD.

---

## Core engineering

**Distributed locking (no overselling).** Order creation acquires a per-product lock in Redis using `SET NX PX` (atomic set-if-absent with an auto-expiry safety net), releases it via a Lua script that only deletes the lock if the caller still owns it (token check), and acquires multiple product locks in sorted order to make deadlocks structurally impossible.

**Idempotency.** Every order carries a client-supplied idempotency key. A duplicate request (double-click, network retry) returns the original order instead of creating a second one or double-reserving stock, backed by a unique database constraint.

**Order state machine.** Orders move only through legal transitions (`PENDING → CONFIRMED → SHIPPED → DELIVERED`, with `CANCELLED` reachable from pending/confirmed). Illegal jumps are rejected before any write.

**Two-phase stock accounting.** Placing an order _reserves_ stock (holds it without deducting); confirming _deducts_ it; cancelling _releases_ the hold. This lets the system block overselling without permanently committing inventory before an order is confirmed.

**Supporting layers.** JWT + bcrypt auth with role-based access, request validation, Redis response caching with invalidation on writes, rate limiting (strict on auth endpoints), and API versioning under `/api/v1`.

---

## Tech stack

| Layer            | Technology                                             |
| ---------------- | ------------------------------------------------------ |
| Runtime          | Node.js 22, Express                                    |
| Database         | PostgreSQL 16 (Prisma ORM v7)                          |
| Cache & locking  | Redis                                                  |
| Auth             | JWT, bcrypt                                            |
| Containerization | Docker, docker-compose                                 |
| CI               | GitHub Actions (unit + end-to-end tests on every push) |
| Deployment       | Render (API), Neon (Postgres), Upstash (Redis)         |

---

## Testing

**Unit tests** (`npm test`) — password hashing, JWT, and auth middleware in isolation.

**End-to-end smoke tests** (`npm run smoke`) — 23 checks against a running server covering the full API. The key one:

> **Concurrent orders on the last unit** — fires two simultaneous order requests for a product with one unit in stock, asserts exactly one succeeds (`201`) and one is rejected (`409`), then verifies final inventory shows zero available and one reserved. This is the automated proof that the distributed lock prevents overselling under real concurrency.

Both suites run automatically in CI on every push, and pass against the live production deployment.

---

## Running locally

Requires Docker.

```bash
git clone https://github.com/Akarsh444/Invarion.git
cd Invarion
docker compose up --build
```

This starts the API, PostgreSQL, and Redis together. The API runs migrations on startup and listens on `http://localhost:3000`.

Run the end-to-end tests against it:

```bash
npm run smoke
```

---

## API overview

All routes are under `/api/v1`.

**Auth** — `POST /auth/register`, `POST /auth/login`

**Products** — `GET /products`, `GET /products/:id` (public, cached); `POST`, `PUT`, `DELETE` (admin)

**Inventory** — `GET /inventory/product/:id` (public); set stock, add stock, low-stock alerts (admin)

**Orders**

- `POST /orders` — create an order (reserves stock, requires idempotency key)
- `GET /orders/my` — the authenticated user's orders
- `GET /orders/:id` — single order (owner or admin)
- `PATCH /orders/:id/status` — advance order status (admin, state-machine enforced)

---

## Architecture notes

The `docker-compose` setup is the local development environment (API + Postgres + Redis in one command). Production runs the same container on Render, pointed at managed Neon Postgres and Upstash Redis via environment variables — giving a clean local/production split with no code differences, only configuration.

Every `git push` to `main` triggers the CI pipeline and, on success, an automatic redeploy.
