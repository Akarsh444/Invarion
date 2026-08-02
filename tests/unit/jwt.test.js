const { generateToken, verifyToken } = require('../../src/utils/jwt');

describe('JWT Utility', () => {
  const payload = { userId: 'abc-123', email: 'test@example.com', role: 'CUSTOMER' };

  test('generateToken produces a valid JWT string', () => {
    const token = generateToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts: header.payload.signature
  });

  test('verifyToken correctly decodes a valid token', () => {
    const token = generateToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  test('verifyToken returns null for an invalid token', () => {
    const decoded = verifyToken('this.is.not.a.valid.token');
    expect(decoded).toBeNull();
  });

  test('verifyToken returns null for a tampered token', () => {
    const token = generateToken(payload);
    const tamperedToken = token.slice(0, -5) + 'XXXXX'; // Corrupt the signature
    const decoded = verifyToken(tamperedToken);
    expect(decoded).toBeNull();
  });
});