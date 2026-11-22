import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { validateOrderInput } from './shared/orderValidation.ts';
import {
  claimAdminHash,
  createOrder,
  findDuplicateTransaction,
  getClaimedAdminHash,
  getOrderById,
  getOrderSummaryStats,
  listAdminOrders,
  transitionOrderStatus,
  updateOrderAdminNote,
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

function getEnvAdminPasscode(): string {
  return typeof process.env.ADMIN_PASSCODE === 'string' ? process.env.ADMIN_PASSCODE.trim() : '';
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

  // Public Order Creation Route (Customer Checkout)
  app.post('/api/orders', (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const validation = validateOrderInput(body);

      if (!validation.valid || !validation.sanitized) {
        return res.status(400).json({
          error: 'Please check the highlighted fields and try again.',
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
      } = validation.sanitized;

      if (findDuplicateTransaction(paymentMethod, transactionId)) {
        return res.status(409).json({
          error:
            'This Transaction ID has already been submitted for the selected payment method. Please check your TrxID or wait for admin verification.',
          fieldErrors: {
            transactionId: 'Duplicate Transaction ID detected.',
          },
        });
      }

      const orderId = generateOrderId();
      const submittedAt = new Date().toISOString();

      const savedOrder = createOrder({
        orderId,
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
            'This Transaction ID has already been submitted. Duplicate orders are not allowed.',
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

  // Admin Auth Status (never returns credentials or hashes)
  app.get('/api/admin/auth-status', (_req, res) => {
    const envPasscode = getEnvAdminPasscode();
    if (envPasscode.length > 0) {
      return res.json({ mode: 'env' });
    }
    const claimedHash = getClaimedAdminHash();
    return res.json({ mode: claimedHash ? 'claimed' : 'unclaimed' });
  });

  // One-time First-Run Admin Setup (strictly locked once claimed or when ADMIN_PASSCODE env is set)
  app.post('/api/admin/bootstrap', (req, res) => {
    const envPasscode = getEnvAdminPasscode();
    if (envPasscode.length > 0 || getClaimedAdminHash()) {
      return res.status(403).json({
        error: 'Admin setup is locked because an admin credential is already configured.',
      });
    }

    const password =
      req.body && typeof req.body.password === 'string' ? req.body.password : '';

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        error: 'Admin password must be between 8 and 128 characters.',
      });
    }

    const passwordHash = hashPassword(password);
    const created = claimAdminHash(passwordHash);
    if (!created) {
      return res.status(403).json({
        error: 'Admin password has already been claimed.',
      });
    }

    const session = issueAdminToken();
    return res.status(201).json({
      token: session.token,
      expiresAt: session.expiresAt,
      admin: { role: 'admin' },
    });
  });

  // Admin Login
  app.post('/api/admin/login', (req, res) => {
    const clientIp = getClientIp(req);
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many failed login attempts. Try again in ${rateCheck.retryAfterSec ?? 60} seconds.`,
      });
    }

    const password =
      req.body && typeof req.body.password === 'string' ? req.body.password : '';

    if (!password) {
      return res.status(400).json({ error: 'Please enter the admin password.' });
    }

    const envPasscode = getEnvAdminPasscode();
    let authenticated = false;

    if (envPasscode.length > 0) {
      authenticated = verifyTimingSafePlaintext(password, envPasscode);
    } else {
      const claimedHash = getClaimedAdminHash();
      if (!claimedHash) {
        return res.status(403).json({
          error: 'No admin password configured yet. Complete first-time setup first.',
        });
      }
      authenticated = verifyScryptPassword(password, claimedHash);
    }

    if (!authenticated) {
      recordFailedLogin(clientIp);
      return res.status(401).json({ error: 'Invalid admin password.' });
    }

    clearFailedLogins(clientIp);
    const session = issueAdminToken();
    return res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      admin: { role: 'admin' },
    });
  });

  // Protected Admin Session Check & Logout
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
