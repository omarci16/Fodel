import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = () => import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
export function valuationActionToken(id: string): string {
  if (!secret()) throw new Error('valuation-action-secret-missing');
  return createHmac('sha256', secret()).update(`valuation-result:${id}`).digest('hex');
}
export function validValuationActionToken(id: string, token: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const expected = Buffer.from(valuationActionToken(id), 'hex');
  return timingSafeEqual(expected, Buffer.from(token, 'hex'));
}
