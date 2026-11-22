import { getEnvAdminPasscode, jsonResponse, readClaimedAdmin } from '../_lib/adminRuntime';

export function GET(): Response {
  const envPasscode = getEnvAdminPasscode();
  if (envPasscode.length > 0) {
    return jsonResponse({ mode: 'env' }, 200);
  }
  const claimed = readClaimedAdmin();
  const hasPassword = Boolean(claimed && claimed.passwordHash.length > 0);
  return jsonResponse({ mode: hasPassword ? 'claimed' : 'unclaimed' }, 200);
}
