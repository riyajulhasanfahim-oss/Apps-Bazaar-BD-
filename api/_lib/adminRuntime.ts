import crypto from 'node:crypto';
import fs from 'node:fs';
import { DEFAULT_PAYMENT_METHODS } from '../../shared/paymentMethods';
import {
  extractYouTubeVideoId,
  isValidMediaImageUrl,
  type DemoVideoItem,
  type ShortVideoItem,
} from '../../shared/youtube';

const RUNTIME_SIGNING_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;
const TMP_ADMIN_FILE = '/tmp/apps-bazaar-admin.json';
const TMP_ORDERS_FILE = '/tmp/apps-bazaar-orders.json';
const TMP_PAYMENT_FILE = '/tmp/apps-bazaar-payment-settings.json';
const TMP_VIDEOS_FILE = '/tmp/apps-bazaar-videos.json';

interface ClaimedAdminFile {
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface SessionPayload {
  sub: 'admin';
  role: 'admin';
  email?: string;
  jti: string;
  iat: number;
  exp: number;
}

const revokedTokens = new Map<string, number>();

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function getEnvAdminPasscode(): string {
  return typeof process.env.ADMIN_PASSCODE === 'string'
    ? process.env.ADMIN_PASSCODE.trim()
    : '';
}

export function getEnvAdminEmail(): string {
  return typeof process.env.ADMIN_EMAIL === 'string'
    ? process.env.ADMIN_EMAIL.trim().toLowerCase()
    : '';
}

export function isValidEmailAddress(email: string): boolean {
  return email.length >= 5 && email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function readClaimedAdmin(): ClaimedAdminFile | null {
  try {
    if (!fs.existsSync(TMP_ADMIN_FILE)) return null;
    const raw = fs.readFileSync(TMP_ADMIN_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ClaimedAdminFile>;
    if (
      parsed &&
      typeof parsed.email === 'string' &&
      typeof parsed.passwordHash === 'string'
    ) {
      return {
        email: parsed.email.trim().toLowerCase(),
        passwordHash: parsed.passwordHash,
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveClaimedAdmin(email: string, passwordHash: string): boolean {
  try {
    const existing = readClaimedAdmin();
    if (existing && existing.passwordHash.length > 0) return false;
    if (existing && passwordHash === '' && existing.email.length > 0) return false;
    const record: ClaimedAdminFile = {
      email: email.trim().toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(TMP_ADMIN_FILE, JSON.stringify(record), 'utf8');
    return true;
  } catch {
    return false;
  }
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
    const expected = Buffer.from(keyHex, 'hex');
    const actual = crypto.scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function verifyTimingSafePlaintext(candidate: string, expected: string): boolean {
  const c = crypto.createHash('sha256').update(candidate).digest();
  const e = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(c, e);
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
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as SessionPayload;
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
    revokedTokens.set(payload.jti, payload.exp);
  }
}

export function extractBearerFromRequest(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function requireAdminRequest(
  request: Request
): { ok: true; payload: SessionPayload } | { ok: false; response: Response } {
  const token = extractBearerFromRequest(request);
  if (!token) {
    return { ok: false, response: jsonResponse({ error: 'Authentication required.' }, 401) };
  }
  const payload = verifyAdminToken(token);
  if (!payload) {
    return {
      ok: false,
      response: jsonResponse({ error: 'Session expired or invalid. Please sign in again.' }, 401),
    };
  }
  return { ok: true, payload };
}

export function readTmpOrders(): Array<Record<string, unknown>> {
  try {
    if (!fs.existsSync(TMP_ORDERS_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(TMP_ORDERS_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readTmpPaymentSettings() {
  try {
    if (fs.existsSync(TMP_PAYMENT_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TMP_PAYMENT_FILE, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback to defaults
  }
  return DEFAULT_PAYMENT_METHODS;
}

export function readTmpVideos(): { shorts: ShortVideoItem[]; demoVideo: DemoVideoItem | null } {
  try {
    if (fs.existsSync(TMP_VIDEOS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TMP_VIDEOS_FILE, 'utf8')) as {
        shorts?: ShortVideoItem[];
        demoVideo?: DemoVideoItem | null;
      };
      return {
        shorts: Array.isArray(parsed?.shorts) ? parsed.shorts : [],
        demoVideo: parsed?.demoVideo ?? null,
      };
    }
  } catch {
    // fallback
  }
  return { shorts: [], demoVideo: null };
}

export function writeTmpShorts(rawItems: unknown): { ok: true; shorts: ShortVideoItem[] } | { ok: false; error: string } {
  if (!Array.isArray(rawItems)) return { ok: false, error: 'Invalid shorts list payload.' };
  const sanitized: ShortVideoItem[] = [];
  for (let i = 0; i < Math.min(rawItems.length, 20); i += 1) {
    const obj = rawItems[i] as Record<string, unknown>;
    if (!obj || typeof obj !== 'object') return { ok: false, error: `Invalid item #${i + 1}.` };
    const thumbnailUrl = typeof obj.thumbnailUrl === 'string' ? obj.thumbnailUrl.trim() : '';
    const youtubeUrl = typeof obj.youtubeUrl === 'string' ? obj.youtubeUrl.trim() : '';
    if (!isValidMediaImageUrl(thumbnailUrl) || !extractYouTubeVideoId(youtubeUrl)) {
      return { ok: false, error: `Short #${i + 1} has invalid thumbnail or YouTube URL.` };
    }
    const rawId = typeof obj.id === 'string' ? obj.id.trim() : '';
    const title = typeof obj.title === 'string' ? obj.title.trim().slice(0, 80) : '';
    sanitized.push({
      id: /^[A-Za-z0-9_-]{3,40}$/.test(rawId) ? rawId : `short-${Date.now()}-${i + 1}`,
      title: title || `App Short #${i + 1}`,
      thumbnailUrl,
      youtubeUrl,
    });
  }
  const current = readTmpVideos();
  try {
    fs.writeFileSync(TMP_VIDEOS_FILE, JSON.stringify({ ...current, shorts: sanitized }), 'utf8');
  } catch {
    // ignore write error in restricted runtime
  }
  return { ok: true, shorts: sanitized };
}

export function writeTmpDemoVideo(
  rawInput: unknown
): { ok: true; demoVideo: DemoVideoItem | null } | { ok: false; error: string } {
  const current = readTmpVideos();
  if (rawInput === null) {
    try {
      fs.writeFileSync(TMP_VIDEOS_FILE, JSON.stringify({ ...current, demoVideo: null }), 'utf8');
    } catch {
      // ignore
    }
    return { ok: true, demoVideo: null };
  }
  if (!rawInput || typeof rawInput !== 'object') {
    return { ok: false, error: 'Invalid demo video payload.' };
  }
  const obj = rawInput as Record<string, unknown>;
  const thumbnailUrl = typeof obj.thumbnailUrl === 'string' ? obj.thumbnailUrl.trim() : '';
  const youtubeUrl = typeof obj.youtubeUrl === 'string' ? obj.youtubeUrl.trim() : '';
  if (!isValidMediaImageUrl(thumbnailUrl) || !extractYouTubeVideoId(youtubeUrl)) {
    return { ok: false, error: 'Please enter a valid Thumbnail URL and YouTube Video URL.' };
  }
  const demoVideo: DemoVideoItem = {
    title: typeof obj.title === 'string' ? obj.title.trim().slice(0, 120) : '',
    description: typeof obj.description === 'string' ? obj.description.trim().slice(0, 300) : '',
    thumbnailUrl,
    youtubeUrl,
  };
  try {
    fs.writeFileSync(TMP_VIDEOS_FILE, JSON.stringify({ ...current, demoVideo }), 'utf8');
  } catch {
    // ignore
  }
  return { ok: true, demoVideo };
}
