import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

// Ephemeral fallback signing key if SESSION_SECRET is not provided in env
const RUNTIME_SIGNING_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
// Store jti -> exp timestamp and prune expired entries on writes/checks
const revokedTokens = new Map<string, number>();

function pruneRevokedTokens(): void {
  const now = Date.now();
  for (const [jti, exp] of revokedTokens.entries()) {
    if (now > exp) {
      revokedTokens.delete(jti);
    }
  }
}

// Per-IP and global login attempt rate limiters
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
let globalLoginFailures = { count: 0, resetAt: 0 };
const MAX_ATTEMPTS = 10;
const MAX_GLOBAL_ATTEMPTS = 40;
const WINDOW_MS = 10 * 60 * 1000;

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  if (now <= globalLoginFailures.resetAt && globalLoginFailures.count >= MAX_GLOBAL_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((globalLoginFailures.resetAt - now) / 1000),
    };
  }
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    return { allowed: true };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { allowed: true };
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  if (now > globalLoginFailures.resetAt) {
    globalLoginFailures = { count: 1, resetAt: now + WINDOW_MS };
  } else {
    globalLoginFailures.count += 1;
  }

  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearFailedLogins(ip: string): void {
  loginAttempts.delete(ip);
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyScryptPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const expectedBuffer = Buffer.from(keyHex, 'hex');
    const actualBuffer = crypto.scryptSync(password, salt, 64);
    if (expectedBuffer.length !== actualBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

export function verifyTimingSafePlaintext(candidate: string, expected: string): boolean {
  const candidateDigest = crypto.createHash('sha256').update(candidate).digest();
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(candidateDigest, expectedDigest);
}

interface SessionPayload {
  sub: 'admin';
  role: 'admin';
  email?: string;
  jti: string;
  iat: number;
  exp: number;
}

export function issueAdminToken(email?: string): { token: string; expiresAt: string } {
  const now = Date.now();
  const exp = now + TOKEN_TTL_MS;
  const payload: SessionPayload = {
    sub: 'admin',
    role: 'admin',
    ...(email ? { email } : {}),
    jti: crypto.randomBytes(12).toString('hex'),
    iat: now,
    exp,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', RUNTIME_SIGNING_SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(exp).toISOString(),
  };
}

export function verifyAdminToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', RUNTIME_SIGNING_SECRET)
      .update(encodedPayload)
      .digest('base64url');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as SessionPayload;

    pruneRevokedTokens();
    if (
      decoded.role !== 'admin' ||
      decoded.sub !== 'admin' ||
      typeof decoded.exp !== 'number' ||
      Date.now() > decoded.exp ||
      revokedTokens.has(decoded.jti)
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export function revokeAdminToken(token: string): void {
  const payload = verifyAdminToken(token);
  if (payload?.jti) {
    pruneRevokedTokens();
    revokedTokens.set(payload.jti, payload.exp);
  }
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const payload = verifyAdminToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }
  next();
}
