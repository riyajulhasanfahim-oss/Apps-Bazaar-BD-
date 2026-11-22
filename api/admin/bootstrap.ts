import {
  getEnvAdminPasscode,
  hashPassword,
  issueAdminToken,
  isValidEmailAddress,
  jsonResponse,
  readClaimedAdmin,
  saveClaimedAdmin,
} from '../_lib/adminRuntime';

export async function POST(request: Request): Promise<Response> {
  const claimed = readClaimedAdmin();
  if (getEnvAdminPasscode().length > 0 || (claimed && claimed.passwordHash.length > 0)) {
    return jsonResponse(
      { error: 'Admin setup is locked because an admin credential is already configured.' },
      403
    );
  }

  let rawBody: unknown = {};
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid setup payload.' }, 400);
  }

  const body =
    rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!isValidEmailAddress(email)) {
    return jsonResponse({ error: 'Please enter a valid administrator email address.' }, 400);
  }
  if (password.length < 8 || password.length > 128) {
    return jsonResponse({ error: 'Admin password must be between 8 and 128 characters.' }, 400);
  }

  const passwordHash = hashPassword(password);
  if (!saveClaimedAdmin(email, passwordHash)) {
    return jsonResponse({ error: 'Admin credentials have already been claimed.' }, 403);
  }

  const session = issueAdminToken(email);
  return jsonResponse(
    {
      token: session.token,
      expiresAt: session.expiresAt,
      admin: { role: 'admin', email },
    },
    201
  );
}
