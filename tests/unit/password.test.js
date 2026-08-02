const { hashPassword, comparePassword } = require('../../src/utils/password');

describe('Password Utility', () => {
  test('hashPassword produces a different string than the original', async () => {
    const plain = 'MySecurePass123';
    const hashed = await hashPassword(plain);
    expect(hashed).not.toBe(plain);
    expect(hashed.length).toBeGreaterThan(20); // bcrypt hashes are long
  });

  test('hashPassword produces a different hash each time (due to salting)', async () => {
    const plain = 'MySecurePass123';
    const hash1 = await hashPassword(plain);
    const hash2 = await hashPassword(plain);
    expect(hash1).not.toBe(hash2); // Different salts = different hashes
  });

  test('comparePassword returns true for correct password', async () => {
    const plain = 'MySecurePass123';
    const hashed = await hashPassword(plain);
    const isValid = await comparePassword(plain, hashed);
    expect(isValid).toBe(true);
  });

  test('comparePassword returns false for wrong password', async () => {
    const plain = 'MySecurePass123';
    const hashed = await hashPassword(plain);
    const isValid = await comparePassword('WrongPassword', hashed);
    expect(isValid).toBe(false);
  });
});