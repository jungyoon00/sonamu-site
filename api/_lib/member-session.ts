import { createHmac, timingSafeEqual } from 'node:crypto';

export const MEMBER_SESSION_COOKIE = 'sonamu_member_session';

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET is missing or too short');
  }

  return secret;
}

export function isMemberSessionValid(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return false;

  const prefix = `${MEMBER_SESSION_COOKIE}=`;
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) return false;

  const token = cookie.slice(prefix.length);
  const [payload, receivedSignature, extra] = token.split('.');

  if (!payload || !receivedSignature || extra !== undefined) {
    return false;
  }

  const expectedSignature = createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest();

  const actualSignature = Buffer.from(receivedSignature, 'base64url');

  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return false;
  }

  const expiresAt = Number(
    Buffer.from(payload, 'base64url').toString('utf8')
  );

  return Number.isSafeInteger(expiresAt) && expiresAt > Date.now();
}