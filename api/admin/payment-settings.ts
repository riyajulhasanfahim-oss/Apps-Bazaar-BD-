import {
  jsonResponse,
  readTmpPaymentSettings,
  requireAdminRequest,
} from '../_lib/adminRuntime';

export function GET(request: Request): Response {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  return jsonResponse({ settings: readTmpPaymentSettings() }, 200);
}
