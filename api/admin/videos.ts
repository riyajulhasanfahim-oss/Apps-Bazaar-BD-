import {
  jsonResponse,
  readTmpVideos,
  requireAdminRequest,
} from '../_lib/adminRuntime';

export function GET(request: Request): Response {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const content = readTmpVideos();
  return jsonResponse({ shorts: content.shorts, demoVideo: content.demoVideo }, 200);
}
