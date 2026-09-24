import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateResetToken,
  hashResetToken,
  createSessionToken,
  verifySessionToken,
} from '../src/lib/auth';
import { SessionPayload } from '../src/types';

describe('Authentication & Security Utilities', () => {
  it('should hash and verify passwords successfully with Argon2id / secure algorithm', async () => {
    const password = 'SuperSecretProductionPassword123!';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(20);

    // Verify correct password matches
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);

    // Verify incorrect password fails
    const isInvalid = await verifyPassword('WrongPassword123!', hash);
    expect(isInvalid).toBe(false);
  });

  it('should generate cryptographically random reset tokens and deterministic SHA-256 hashes', () => {
    const { token, tokenHash } = generateResetToken();

    expect(token).toBeDefined();
    expect(token.length).toBe(64); // 32 bytes hex = 64 chars

    expect(tokenHash).toBeDefined();
    expect(tokenHash.length).toBe(64);

    // Re-hashing the token must yield the identical tokenHash
    const recomputedHash = hashResetToken(token);
    expect(recomputedHash).toBe(tokenHash);
  });

  it('should issue and verify valid JWT session tokens with complete payload integrity', async () => {
    const payload: SessionPayload = {
      userId: '66e9b46f5c49b109b02a1122',
      employeeId: 'EMP-007',
      username: 'james.bond',
      name: 'James Bond',
      role: 'EMPLOYEE',
      mustChangePassword: false,
    };

    const token = await createSessionToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.employeeId).toBe('EMP-007');
    expect(decoded?.username).toBe('james.bond');
    expect(decoded?.role).toBe('EMPLOYEE');
    expect(decoded?.mustChangePassword).toBe(false);
  });

  it('should reject tampered or corrupted JWT tokens safely without throwing', async () => {
    const corruptedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature';
    const result = await verifySessionToken(corruptedToken);
    expect(result).toBeNull();
  });
});
