import crypto from 'crypto';
import { NextRequest } from 'next/server';

// Vercel sends `Authorization: Bearer $CRON_SECRET` to cron routes when the
// CRON_SECRET env var is set (any plan). Manual triggers may use CRON_SECRET or ADMIN_API_KEY.
export function isAuthorizedCron(request: NextRequest): boolean {
  const header = request.headers.get('authorization') || '';
  const keys = [process.env.CRON_SECRET, process.env.ADMIN_API_KEY].filter(Boolean) as string[];
  return keys.some((key) => {
    const expected = Buffer.from(`Bearer ${key}`);
    const given = Buffer.from(header);
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
  });
}
