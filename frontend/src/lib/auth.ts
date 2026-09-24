import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { SessionPayload } from '../types';

const AUTH_SECRET = process.env.AUTH_SECRET || 'fallback_development_auth_secret_minimum_32_chars_long_key!';
const JWT_SECRET = new TextEncoder().encode(AUTH_SECRET);
const TOKEN_EXPIRY = '8h';

export async function hashPassword(password: string): Promise<string> {
  try {
    const argon2 = await import('@node-rs/argon2');
    return await argon2.hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
      algorithm: 2,
    });
  } catch {
    try {
      const argon2Fallback = await import('argon2');
      return await argon2Fallback.hash(password, {
        type: argon2Fallback.argon2id,
        memoryCost: 19456,
        timeCost: 2,
      });
    } catch {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
      return `pbkdf2:${salt}:${hash}`;
    }
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;

  if (hash.startsWith('pbkdf2:')) {
    const [, salt, originalHash] = hash.split(':');
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(originalHash, 'hex'));
  }

  try {
    const argon2 = await import('@node-rs/argon2');
    return await argon2.verify(hash, password);
  } catch {
    try {
      const argon2Fallback = await import('argon2');
      return await argon2Fallback.verify(hash, password);
    } catch {
      return false;
    }
  }
}

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
