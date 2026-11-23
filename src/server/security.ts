import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export interface ScryptHash {
  salt: string;
  hash: string;
}

export function hashPasswordScrypt(password: string): ScryptHash {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPasswordScrypt(password: string, stored: ScryptHash): boolean {
  const candidate = crypto.scryptSync(password, stored.salt, 64);
  const expected = Buffer.from(stored.hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

const EPHEMERAL_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 16
    ? process.env.ADMIN_SESSION_SECRET
    : EPHEMERAL_SESSION_SECRET;
}

export interface AdminTokenPayload {
  email: string;
  role: 'admin';
  epoch: number;
  exp: number;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

export function verifyAdminToken(token: string, currentEpoch: number): AdminTokenPayload | null {
  try {
    const [data, sig] = token.split('.');
    if (!data || !sig) return null;
    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(data)
      .digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as AdminTokenPayload;
    if (parsed.exp < Date.now()) return null;
    if (parsed.epoch !== currentEpoch) return null;
    if (parsed.role !== 'admin') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function validateExternalHttpsUrl(rawUrl: string): { valid: boolean; url?: URL; reason?: string } {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') {
      return { valid: false, reason: 'Apenas URLs HTTPS são permitidas para conectores externos.' };
    }
    const host = parsed.hostname.toLowerCase();
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254', 'metadata.google.internal'];
    if (
      blockedHosts.includes(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host)
    ) {
      return { valid: false, reason: 'Endereços locais ou privados não são permitidos.' };
    }
    return { valid: true, url: parsed };
  } catch {
    return { valid: false, reason: 'URL inválida.' };
  }
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

export function createRateLimiter(maxRequests: number, windowMs: number, prefix: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const key = `${prefix}:${ip}`;
    const now = Date.now();
    const current = rateBuckets.get(key);

    if (!current || current.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.status(429).json({
        error: `Limite de requisições excedido. Tente novamente em ${retryAfterSec}s.`,
        retryAfterSec,
      });
      return;
    }

    current.count += 1;
    next();
  };
}
