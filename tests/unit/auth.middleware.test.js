const { authenticate, requireAdmin } = require('../../src/middlewares/auth.middleware');
const { generateToken } = require('../../src/utils/jwt');

// Helper to create fake req/res/next objects for testing middleware in isolation
function mockReqRes(headers = {}) {
  const req = { headers };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('authenticate middleware', () => {
  test('calls next() and attaches req.user for a valid token', () => {
    const token = generateToken({ userId: '123', email: 'a@b.com', role: 'CUSTOMER' });
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.userId).toBe('123');
  });

  test('returns 401 when no Authorization header is present', () => {
    const { req, res, next } = mockReqRes({});

    authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token is invalid', () => {
    const { req, res, next } = mockReqRes({ authorization: 'Bearer invalid.token.here' });

    authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAdmin middleware', () => {
  test('calls next() when user role is ADMIN', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'ADMIN' };

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('returns 403 when user role is CUSTOMER', () => {
    const { req, res, next } = mockReqRes();
    req.user = { role: 'CUSTOMER' };

    requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});