import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { isValidPaymentMethod, validateOrderInput } from './shared/orderValidation.ts';
import {
  bindAdminEmailIfUnset,
  claimAdminCredentials,
  createOrder,
  findDuplicateTransaction,
  getClaimedAdminConfig,
  getOrderById,
  getOrderSummaryStats,
  getVideoContent,
  listAdminOrders,
  listPaymentSettings,
  saveDemoVideo,
  saveShortsVideos,
  transitionOrderStatus,
  updateOrderAdminNote,
  updatePaymentSetting,
  type AdminOrderAction,
  type AdminOrderFilter,
} from './server/db.ts';
import {
  checkLoginRateLimit,
  clearFailedLogins,
  extractBearerToken,
  hashPassword,
  issueAdminToken,
  recordFailedLogin,
  requireAdmin,
  revokeAdminToken,
  verifyScryptPassword,
  verifyTimingSafePlaintext,
} from './server/auth.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const PRODUCT_NAME = 'Ad Earning';
const AUTHORITATIVE_PRICE = 999;
const PREVIOUS_PRICE = 3000;
const CURRENCY = 'BDT';

const VALID_FILTERS = new Set<AdminOrderFilter>([
  'all',
  'pending_verification',
  'approved',
  'rejected',
  'completed',
]);

const VALID_ACTIONS = new Set<AdminOrderAction>([
  'approve_payment',
  'reject_payment',
  'mark_processing',
  'mark_completed',
]);

function generateOrderId(): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const randomCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `AB-${yy}${mm}${dd}-${randomCode}`;
}

function generateUserId(): string {
  return `USR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function getEnvAdminPasscode(): string {
  return typeof process.env.ADMIN_PASSCODE === 'string' ? process.env.ADMIN_PASSCODE.trim() : '';
}

function getEnvAdminEmail(): string {
  return typeof process.env.ADMIN_EMAIL === 'string'
    ? process.env.ADMIN_EMAIL.trim().toLowerCase()
    : '';
}

function isValidEmailAddress(email: string): boolean {
  return email.length >= 5 && email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(req: express.Request): string {
  return req.ip || 'unknown';
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });
  app.use(express.json({ limit: '16kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Public Payment Methods Configuration (read from SQLite — single source of truth)
  app.get('/api/payment-methods', (_req, res) => {
    try {
      const methods = listPaymentSettings(true);
      res.json({ methods });
    } catch (err) {
      console.error('Payment methods fetch error:', err);
      res.status(500).json({ error: 'Unable to load payment methods.' });
    }
  });

  // Public Order Creation Route (Customer Checkout)
  app.post('/api/orders', (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const validation = validateOrderInput(body);

      if (!validation.valid || !validation.sanitized) {
        return res.status(400).json({
          error: 'অনুগ্রহ করে সব প্রয়োজনীয় তথ্য সঠিকভাবে পূরণ করুন।',
          fieldErrors: validation.errors,
        });
      }

      const {
        customerName,
        paymentMethod,
        senderNumber,
        transactionId,
        whatsappNumber,
        imoNumber,
        userId,
        invoiceRef,
      } = validation.sanitized;

      if (findDuplicateTransaction(paymentMethod, transactionId)) {
        return res.status(409).json({
          error:
            'এই Transaction ID দিয়ে ইতিমধ্যেই একটি পেমেন্ট রিকুয়েস্ট জমা দেওয়া হয়েছে। অনুগ্রহ করে অ্যাডমিন ভেরিফিকেশনের জন্য অপেক্ষা করুন।',
          fieldErrors: {
            transactionId: 'Duplicate Transaction ID detected.',
          },
        });
      }

      const orderId = generateOrderId();
      const resolvedUserId = userId ?? generateUserId();
      const submittedAt = new Date().toISOString();

      const savedOrder = createOrder({
        orderId,
        userId: resolvedUserId,
        invoiceRef: invoiceRef ?? orderId,
        customerName,
        productName: PRODUCT_NAME,
        amount: AUTHORITATIVE_PRICE,
        previousPrice: PREVIOUS_PRICE,
        currency: CURRENCY,
        paymentMethod,
        senderNumber,
        transactionId,
        whatsappNumber,
        imoNumber,
        submittedAt,
      });

      return res.status(201).json({
        order: {
          orderId: savedOrder.orderId,
          userId: savedOrder.userId,
          invoiceRef: savedOrder.invoiceRef,
          customerName: savedOrder.customerName,
          productName: savedOrder.productName,
          amount: savedOrder.amount,
          currency: savedOrder.currency,
          paymentMethod: savedOrder.paymentMethod,
          senderNumber: savedOrder.senderNumber,
          transactionId: savedOrder.transactionId,
          whatsappNumber: savedOrder.whatsappNumber,
          imoNumber: savedOrder.imoNumber,
          submittedAt: savedOrder.submittedAt,
          paymentStatus: savedOrder.paymentStatus,
          orderStatus: savedOrder.orderStatus,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
          error:
            'এই Transaction ID দিয়ে ইতিমধ্যেই একটি অর্ডার জমা দেওয়া হয়েছে। ডুপ্লিকেট রিকুয়েস্ট অনুমোদিত নয়।',
          fieldErrors: {
            transactionId: 'Duplicate Transaction ID detected.',
          },
        });
      }

      console.error('Order submission error:', err);
      return res.status(500).json({
        error: 'Unable to save your order request right now. Please try again in a moment.',
      });
    }
  });

  // Admin Auth Status (never returns credentials, emails, or hashes)
  app.get('/api/admin/auth-status', (_req, res) => {
    const envPasscode = getEnvAdminPasscode();
    if (envPasscode.length > 0) {
      return res.json({ mode: 'env' });
    }
    const claimedConfig = getClaimedAdminConfig();
    const hasClaimedPassword = Boolean(claimedConfig && claimedConfig.passwordHash.length > 0);
    return res.json({ mode: hasClaimedPassword ? 'claimed' : 'unclaimed' });
  });

  // One-time First-Run Admin Setup (Email + Scrypt Hashed Password)
  app.post('/api/admin/bootstrap', (req, res) => {
    const envPasscode = getEnvAdminPasscode();
    const existing = getClaimedAdminConfig();
    if (envPasscode.length > 0 || (existing && existing.passwordHash.length > 0)) {
      return res.status(403).json({
        error: 'Admin setup is locked because an admin credential is already configured.',
      });
    }

    const email =
      req.body && typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    const password =
      req.body && typeof req.body.password === 'string' ? req.body.password : '';

    if (!isValidEmailAddress(email)) {
      return res.status(400).json({
        error: 'Please enter a valid administrator email address.',
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        error: 'Admin password must be between 8 and 128 characters.',
      });
    }

    const passwordHash = hashPassword(password);
    const created = claimAdminCredentials(email, passwordHash);
    if (!created) {
      return res.status(403).json({
        error: 'Admin credentials have already been claimed.',
      });
    }

    const session = issueAdminToken(email);
    return res.status(201).json({
      token: session.token,
      expiresAt: session.expiresAt,
      admin: { role: 'admin', email },
    });
  });

  // Admin Login (Email + Password)
  app.post('/api/admin/login', (req, res) => {
    const clientIp = getClientIp(req);
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many failed login attempts. Try again in ${rateCheck.retryAfterSec ?? 60} seconds.`,
      });
    }

    const email =
      req.body && typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    const password =
      req.body && typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !isValidEmailAddress(email)) {
      return res.status(400).json({ error: 'Please enter a valid admin email address.' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Please enter the admin password.' });
    }

    const envPasscode = getEnvAdminPasscode();
    const envEmail = getEnvAdminEmail();
    const claimedConfig = getClaimedAdminConfig();

    let authenticated = false;

    if (envPasscode.length > 0) {
      const passwordOk = verifyTimingSafePlaintext(password, envPasscode);
      const expectedEmail = envEmail || claimedConfig?.email || '';
      if (expectedEmail) {
        const emailOk = verifyTimingSafePlaintext(email, expectedEmail);
        authenticated = emailOk && passwordOk;
      } else if (passwordOk) {
        // Bind administrator email atomically on first valid ADMIN_PASSCODE verification
        authenticated = bindAdminEmailIfUnset(email);
      }
    } else {
      if (!claimedConfig || !claimedConfig.passwordHash) {
        return res.status(403).json({
          error: 'No admin account configured yet. Complete first-time setup first.',
        });
      }
      const expectedEmail = envEmail || claimedConfig.email || '';
      if (!expectedEmail) {
        return res.status(403).json({
          error: 'Admin email is not configured on the server.',
        });
      }
      const emailOk = verifyTimingSafePlaintext(email, expectedEmail);
      const passwordOk = verifyScryptPassword(password, claimedConfig.passwordHash);
      authenticated = emailOk && passwordOk;
    }

    if (!authenticated) {
      recordFailedLogin(clientIp);
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    clearFailedLogins(clientIp);
    const session = issueAdminToken(email);
    return res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      admin: { role: 'admin', email },
    });
  });

  app.get('/api/admin/me', requireAdmin, (_req, res) => {
    res.json({ authenticated: true, role: 'admin' });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      revokeAdminToken(token);
    }
    res.json({ ok: true });
  });

  // Protected Admin Payment Settings Routes
  app.get('/api/admin/payment-settings', requireAdmin, (_req, res) => {
    try {
      const settings = listPaymentSettings(false);
      return res.json({ settings });
    } catch (err) {
      console.error('Admin payment settings fetch error:', err);
      return res.status(500).json({ error: 'Failed to load payment settings.' });
    }
  });

  app.put('/api/admin/payment-settings/:methodId', requireAdmin, (req, res) => {
    const methodId = String(req.params.methodId ?? '').trim();
    if (!isValidPaymentMethod(methodId)) {
      return res.status(400).json({ error: 'Invalid payment method identifier.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const displayName = typeof body.displayName === 'string' ? body.displayName : '';
    const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber : '';
    const dialCode = typeof body.dialCode === 'string' ? body.dialCode : '';
    const instructions = Array.isArray(body.instructions)
      ? body.instructions.map((item: unknown) => (typeof item === 'string' ? item : ''))
      : [];
    const isActive = body.isActive !== false;

    const result = updatePaymentSetting(methodId, {
      displayName,
      accountNumber,
      dialCode,
      instructions,
      isActive,
    });

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ setting: result.setting });
  });

  // Protected Admin Order Management Routes
  app.get('/api/admin/orders', requireAdmin, (req, res) => {
    try {
      const rawFilter = typeof req.query.status === 'string' ? req.query.status : 'all';
      const filter: AdminOrderFilter = VALID_FILTERS.has(rawFilter as AdminOrderFilter)
        ? (rawFilter as AdminOrderFilter)
        : 'all';
      const search = typeof req.query.q === 'string' ? req.query.q.slice(0, 80) : '';

      const summary = getOrderSummaryStats();
      const orders = listAdminOrders(filter, search);
      return res.json({ summary, orders });
    } catch (err) {
      console.error('Admin orders fetch error:', err);
      return res.status(500).json({ error: 'Failed to load orders.' });
    }
  });

  app.get('/api/admin/orders/:orderId', requireAdmin, (req, res) => {
    const orderId = String(req.params.orderId ?? '').trim();
    if (!orderId) {
      return res.status(400).json({ error: 'Invalid order ID.' });
    }
    const order = getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    return res.json({ order });
  });

  app.patch('/api/admin/orders/:orderId/status', requireAdmin, (req, res) => {
    const orderId = String(req.params.orderId ?? '').trim();
    const action = req.body && typeof req.body.action === 'string' ? req.body.action : '';
    const rejectionReason =
      req.body && typeof req.body.rejectionReason === 'string'
        ? req.body.rejectionReason
        : undefined;

    if (!orderId || !VALID_ACTIONS.has(action as AdminOrderAction)) {
      return res.status(400).json({ error: 'Invalid order ID or status action.' });
    }

    const result = transitionOrderStatus(
      orderId,
      action as AdminOrderAction,
      rejectionReason
    );

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    const summary = getOrderSummaryStats();
    return res.json({ order: result.order, summary });
  });

  app.patch('/api/admin/orders/:orderId/note', requireAdmin, (req, res) => {
    const orderId = String(req.params.orderId ?? '').trim();
    const adminNotes =
      req.body && typeof req.body.adminNotes === 'string' ? req.body.adminNotes : '';

    if (!orderId) {
      return res.status(400).json({ error: 'Invalid order ID.' });
    }

    const result = updateOrderAdminNote(orderId, adminNotes);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ order: result.order });
  });

  // Public Video Content Route (YouTube Shorts & Demo Long Video)
  app.get('/api/videos', (_req, res) => {
    try {
      const content = getVideoContent();
      return res.json({
        shorts: content.shorts,
        demoVideo: content.demoVideo,
      });
    } catch (err) {
      console.error('Public videos fetch error:', err);
      return res.status(500).json({ error: 'Failed to load video settings.' });
    }
  });

  // Protected Admin Video Management Routes
  app.get('/api/admin/videos', requireAdmin, (_req, res) => {
    try {
      const content = getVideoContent();
      return res.json(content);
    } catch (err) {
      console.error('Admin videos fetch error:', err);
      return res.status(500).json({ error: 'Failed to load video settings.' });
    }
  });

  app.put('/api/admin/videos/shorts', requireAdmin, (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const result = saveShortsVideos((body as Record<string, unknown>).shorts);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json({ shorts: result.shorts });
  });

  app.put('/api/admin/videos/demo', requireAdmin, (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const result = saveDemoVideo((body as Record<string, unknown>).demoVideo);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json({ demoVideo: result.demoVideo });
  });

  app.delete('/api/admin/videos/demo', requireAdmin, (_req, res) => {
    const result = saveDemoVideo(null);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.json({ demoVideo: null });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
