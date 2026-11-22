import {
  extractBearerFromRequest,
  jsonResponse,
  revokeAdminToken,
} from '../_lib/adminRuntime';

export function POST(request: Request): Response {
  const token = extractBearerFromRequest(request);
  if (token) {
    revokeAdminToken(token);
  }
  return jsonResponse({ ok: true }, 200);
}
