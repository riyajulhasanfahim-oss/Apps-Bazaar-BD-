import { jsonResponse, requireAdminRequest } from '../_lib/adminRuntime';

export function GET(request: Request): Response {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  return jsonResponse({ authenticated: true, role: 'admin' }, 200);
}
