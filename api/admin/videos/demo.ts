import {
  jsonResponse,
  requireAdminRequest,
  writeTmpDemoVideo,
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
  const result = writeTmpDemoVideo(body.demoVideo);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ demoVideo: result.demoVideo }, 200);
}

export function DELETE(request: Request): Response {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const result = writeTmpDemoVideo(null);
  if (!result.ok) {
    return jsonResponse({ error: result.error }, 400);
  }

  return jsonResponse({ demoVideo: null }, 200);
}
