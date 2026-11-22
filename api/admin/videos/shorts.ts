import {
  jsonResponse,
  requireAdminRequest,
  writeTmpShorts,
} from '../../_lib/adminRuntime';

export async function PUT(request: Request): Promise<Response> {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  let rawBody: unknown = {};
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid payload.' }, 400);
  }

  const body =
    rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : {};
  const result = writeTmpShorts(body.shorts);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ shorts: result.shorts }, 200);
}
