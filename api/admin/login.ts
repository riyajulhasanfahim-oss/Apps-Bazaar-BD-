import {
  getEnvAdminEmail,
  getEnvAdminPasscode,
  issueAdminToken,
  isValidEmailAddress,
  jsonResponse,
  readClaimedAdmin,
  saveClaimedAdmin,
  verifyScryptPassword,
  verifyTimingSafePlaintext,
} from '../_lib/adminRuntime';

export async function POST(request: Request): Promise<Response> {
  let rawBody: unknown = {};
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid login payload.' }, 400);
  }

  const body =
    rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !isValidEmailAddress(email)) {
    return jsonResponse({ error: 'Please enter a valid admin email address.' }, 400);
  }
  if (!password) {
    return jsonResponse({ error: 'Please enter the admin password.' }, 400);
  }

  const envPasscode = getEnvAdminPasscode();
  const envEmail = getEnvAdminEmail();
  const claimed = readClaimedAdmin();
  let authenticated = false;

  if (envPasscode.length > 0) {
    const passwordOk = verifyTimingSafePlaintext(password, envPasscode);
    const expectedEmail = envEmail || claimed?.email || '';
    if (expectedEmail) {
      authenticated =
        verifyTimingSafePlaintext(email, expectedEmail) && passwordOk;
    } else if (passwordOk) {
      authenticated = saveClaimedAdmin(email, '');
    }
  } else {
    if (!claimed || !claimed.passwordHash) {
      return jsonResponse(
        { error: 'No admin account configured yet. Complete first-time setup first.' },
        403
      );
    }
    const expectedEmail = envEmail || claimed.email;
    authenticated =
      verifyTimingSafePlaintext(email, expectedEmail) &&
      verifyScryptPassword(password, claimed.passwordHash);
  }

  if (!authenticated) {
    return jsonResponse({ error: 'Invalid email address or password.' }, 401);
  }

  const session = issueAdminToken(email);
  return jsonResponse(
    {
      token: session.token,
      expiresAt: session.expiresAt,
      admin: { role: 'admin', email },
    },
    200
  );
}
