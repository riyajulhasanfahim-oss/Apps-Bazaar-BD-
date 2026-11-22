import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { PaymentMethodName } from '../shared/orderValidation.ts';

export type PaymentStatus = 'Pending Verification' | 'Approved' | 'Rejected';
export type OrderStatus = 'Pending' | 'Approved' | 'Processing' | 'Completed' | 'Rejected';
export type AdminOrderFilter =
  | 'all'
  | 'pending_verification'
  | 'approved'
  | 'rejected'
  | 'completed';
export type AdminOrderAction =
  | 'approve_payment'
  | 'reject_payment'
  | 'mark_processing'
  | 'mark_completed';

export interface OrderRecord {
  id: number;
  orderId: string;
  customerName: string;
  productName: string;
  amount: number;
  previousPrice: number;
  currency: string;
  paymentMethod: PaymentMethodName;
  senderNumber: string;
  transactionId: string;
  whatsappNumber: string;
  imoNumber: string | null;
  paymentConfirmed: boolean;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  adminNotes: string | null;
  rejectionReason: string | null;
  verifiedAt: string | null;
  submittedAt: string;
  updatedAt: string;
}

export interface OrderSummaryStats {
  totalOrders: number;
  pendingVerification: number;
  approvedPayments: number;
  rejectedPayments: number;
  completedOrders: number;
}

export interface NewOrderPayload {
  orderId: string;
  customerName: string;
  productName: string;
  amount: number;
  previousPrice: number;
  currency: string;
  paymentMethod: PaymentMethodName;
  senderNumber: string;
  transactionId: string;
  whatsappNumber: string;
  imoNumber: string | null;
  submittedAt: string;
}

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'orders.db');
const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    product_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    previous_price INTEGER NOT NULL,
    currency TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    sender_number TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    imo_number TEXT,
    payment_confirmed INTEGER NOT NULL DEFAULT 1,
    payment_status TEXT NOT NULL DEFAULT 'Pending Verification',
    order_status TEXT NOT NULL DEFAULT 'Pending',
    admin_notes TEXT,
    rejection_reason TEXT,
    verified_at TEXT,
    submitted_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(payment_method, transaction_id)
  );
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status, payment_status);
  CREATE INDEX IF NOT EXISTS idx_orders_submitted_at ON orders(submitted_at DESC);

  CREATE TABLE IF NOT EXISTS admin_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// Preserve existing databases created in Step 3 by adding rejection_reason if absent
const columns = db.prepare(`PRAGMA table_info(orders)`).all() as Array<{ name: string }>;
const hasRejectionReason = columns.some((col) => col.name === 'rejection_reason');
if (!hasRejectionReason) {
  db.exec(`ALTER TABLE orders ADD COLUMN rejection_reason TEXT;`);
}

function mapRowToOrder(row: Record<string, unknown>): OrderRecord {
  return {
    id: Number(row.id),
    orderId: String(row.order_id),
    customerName: String(row.customer_name),
    productName: String(row.product_name),
    amount: Number(row.amount),
    previousPrice: Number(row.previous_price),
    currency: String(row.currency),
    paymentMethod: String(row.payment_method) as PaymentMethodName,
    senderNumber: String(row.sender_number),
    transactionId: String(row.transaction_id),
    whatsappNumber: String(row.whatsapp_number),
    imoNumber: row.imo_number ? String(row.imo_number) : null,
    paymentConfirmed: Number(row.payment_confirmed) === 1,
    paymentStatus: String(row.payment_status) as PaymentStatus,
    orderStatus: String(row.order_status) as OrderStatus,
    adminNotes: row.admin_notes ? String(row.admin_notes) : null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
    submittedAt: String(row.submitted_at),
    updatedAt: String(row.updated_at),
  };
}

const findDuplicateStmt = db.prepare(`
  SELECT order_id FROM orders
  WHERE payment_method = ? AND transaction_id = ?
  LIMIT 1
`);

const insertOrderStmt = db.prepare(`
  INSERT INTO orders (
    order_id,
    customer_name,
    product_name,
    amount,
    previous_price,
    currency,
    payment_method,
    sender_number,
    transaction_id,
    whatsapp_number,
    imo_number,
    payment_confirmed,
    payment_status,
    order_status,
    submitted_at,
    updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'Pending Verification', 'Pending', ?, ?)
`);

const getByOrderIdStmt = db.prepare(`
  SELECT
    id,
    order_id,
    customer_name,
    product_name,
    amount,
    previous_price,
    currency,
    payment_method,
    sender_number,
    transaction_id,
    whatsapp_number,
    imo_number,
    payment_confirmed,
    payment_status,
    order_status,
    admin_notes,
    rejection_reason,
    verified_at,
    submitted_at,
    updated_at
  FROM orders
  WHERE order_id = ?
  LIMIT 1
`);

export function findDuplicateTransaction(
  paymentMethod: PaymentMethodName,
  transactionId: string
): boolean {
  const existing = findDuplicateStmt.get(paymentMethod, transactionId) as
    | { order_id: string }
    | undefined;
  return Boolean(existing);
}

export function createOrder(payload: NewOrderPayload): OrderRecord {
  insertOrderStmt.run(
    payload.orderId,
    payload.customerName,
    payload.productName,
    payload.amount,
    payload.previousPrice,
    payload.currency,
    payload.paymentMethod,
    payload.senderNumber,
    payload.transactionId,
    payload.whatsappNumber,
    payload.imoNumber,
    payload.submittedAt,
    payload.submittedAt
  );

  const row = getByOrderIdStmt.get(payload.orderId) as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error('Failed to verify persisted order record.');
  }

  return mapRowToOrder(row);
}

export function getClaimedAdminHash(): string | null {
  const row = db.prepare(`SELECT password_hash FROM admin_config WHERE id = 1 LIMIT 1`).get() as
    | { password_hash: string }
    | undefined;
  return row ? row.password_hash : null;
}

export function claimAdminHash(passwordHash: string): boolean {
  try {
    db.prepare(
      `INSERT INTO admin_config (id, password_hash, created_at) VALUES (1, ?, ?)`
    ).run(passwordHash, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

export function getOrderSummaryStats(): OrderSummaryStats {
  const row = db
    .prepare(
      `
      SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN payment_status = 'Pending Verification' THEN 1 ELSE 0 END) AS pending_verification,
        SUM(CASE WHEN payment_status = 'Approved' THEN 1 ELSE 0 END) AS approved_payments,
        SUM(CASE WHEN payment_status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_payments,
        SUM(CASE WHEN order_status = 'Completed' THEN 1 ELSE 0 END) AS completed_orders
      FROM orders
    `
    )
    .get() as Record<string, unknown>;

  return {
    totalOrders: Number(row.total_orders ?? 0),
    pendingVerification: Number(row.pending_verification ?? 0),
    approvedPayments: Number(row.approved_payments ?? 0),
    rejectedPayments: Number(row.rejected_payments ?? 0),
    completedOrders: Number(row.completed_orders ?? 0),
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function listAdminOrders(filter: AdminOrderFilter, searchQuery: string): OrderRecord[] {
  const conditions: string[] = [];
  const params: Array<string> = [];

  if (filter === 'pending_verification') {
    conditions.push(`payment_status = 'Pending Verification'`);
  } else if (filter === 'approved') {
    conditions.push(`payment_status = 'Approved'`);
  } else if (filter === 'rejected') {
    conditions.push(`payment_status = 'Rejected'`);
  } else if (filter === 'completed') {
    conditions.push(`order_status = 'Completed'`);
  }

  const trimmed = searchQuery.trim();
  if (trimmed.length > 0) {
    const pattern = `%${escapeLike(trimmed)}%`;
    conditions.push(
      `(order_id LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\' OR whatsapp_number LIKE ? ESCAPE '\\' OR transaction_id LIKE ? ESCAPE '\\')`
    );
    params.push(pattern, pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT
      id,
      order_id,
      customer_name,
      product_name,
      amount,
      previous_price,
      currency,
      payment_method,
      sender_number,
      transaction_id,
      whatsapp_number,
      imo_number,
      payment_confirmed,
      payment_status,
      order_status,
      admin_notes,
      rejection_reason,
      verified_at,
      submitted_at,
      updated_at
    FROM orders
    ${whereClause}
    ORDER BY submitted_at DESC
    LIMIT 250
  `;

  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  return rows.map(mapRowToOrder);
}

export function getOrderById(orderId: string): OrderRecord | null {
  const row = getByOrderIdStmt.get(orderId) as Record<string, unknown> | undefined;
  return row ? mapRowToOrder(row) : null;
}

export function transitionOrderStatus(
  orderId: string,
  action: AdminOrderAction,
  rejectionReason?: string
): { ok: true; order: OrderRecord } | { ok: false; status: number; error: string } {
  const existing = getOrderById(orderId);
  if (!existing) {
    return { ok: false, status: 404, error: 'Order not found.' };
  }

  const now = new Date().toISOString();

  if (action === 'approve_payment') {
    if (existing.paymentStatus !== 'Pending Verification' || existing.orderStatus !== 'Pending') {
      return {
        ok: false,
        status: 409,
        error: 'Only orders with Pending Verification status can be approved.',
      };
    }

    const result = db
      .prepare(
        `
      UPDATE orders
      SET payment_status = 'Approved',
          order_status = 'Approved',
          rejection_reason = NULL,
          verified_at = ?,
          updated_at = ?
      WHERE order_id = ?
        AND payment_status = 'Pending Verification'
        AND order_status = 'Pending'
    `
      )
      .run(now, now, orderId);

    if (result.changes !== 1) {
      return { ok: false, status: 409, error: 'Order status changed concurrently. Please refresh.' };
    }
  } else if (action === 'reject_payment') {
    if (existing.paymentStatus !== 'Pending Verification' || existing.orderStatus !== 'Pending') {
      return {
        ok: false,
        status: 409,
        error: 'Only orders with Pending Verification status can be rejected.',
      };
    }

    const cleanReason = typeof rejectionReason === 'string' ? rejectionReason.trim() : '';
    if (cleanReason.length < 3 || cleanReason.length > 300) {
      return {
        ok: false,
        status: 400,
        error: 'Please provide a rejection reason (3–300 characters).',
      };
    }

    const result = db
      .prepare(
        `
      UPDATE orders
      SET payment_status = 'Rejected',
          order_status = 'Rejected',
          rejection_reason = ?,
          updated_at = ?
      WHERE order_id = ?
        AND payment_status = 'Pending Verification'
        AND order_status = 'Pending'
    `
      )
      .run(cleanReason, now, orderId);

    if (result.changes !== 1) {
      return { ok: false, status: 409, error: 'Order status changed concurrently. Please refresh.' };
    }
  } else if (action === 'mark_processing') {
    if (existing.paymentStatus !== 'Approved' || existing.orderStatus !== 'Approved') {
      return {
        ok: false,
        status: 409,
        error: 'Order payment must be Approved before moving to Processing.',
      };
    }

    const result = db
      .prepare(
        `
      UPDATE orders
      SET order_status = 'Processing',
          updated_at = ?
      WHERE order_id = ?
        AND payment_status = 'Approved'
        AND order_status = 'Approved'
    `
      )
      .run(now, orderId);

    if (result.changes !== 1) {
      return { ok: false, status: 409, error: 'Order status changed concurrently. Please refresh.' };
    }
  } else if (action === 'mark_completed') {
    if (existing.paymentStatus !== 'Approved' || existing.orderStatus !== 'Processing') {
      return {
        ok: false,
        status: 409,
        error: 'Order must be in Processing status before marking as Completed.',
      };
    }

    const result = db
      .prepare(
        `
      UPDATE orders
      SET order_status = 'Completed',
          updated_at = ?
      WHERE order_id = ?
        AND payment_status = 'Approved'
        AND order_status = 'Processing'
    `
      )
      .run(now, orderId);

    if (result.changes !== 1) {
      return { ok: false, status: 409, error: 'Order status changed concurrently. Please refresh.' };
    }
  } else {
    return { ok: false, status: 400, error: 'Unsupported status action.' };
  }

  const updated = getOrderById(orderId);
  if (!updated) {
    return { ok: false, status: 500, error: 'Failed to reload updated order.' };
  }

  return { ok: true, order: updated };
}

export function updateOrderAdminNote(
  orderId: string,
  adminNotes: string
): { ok: true; order: OrderRecord } | { ok: false; status: number; error: string } {
  const existing = getOrderById(orderId);
  if (!existing) {
    return { ok: false, status: 404, error: 'Order not found.' };
  }

  const cleaned = adminNotes.trim();
  if (cleaned.length > 1000) {
    return { ok: false, status: 400, error: 'Admin note cannot exceed 1000 characters.' };
  }

  const now = new Date().toISOString();
  db.prepare(
    `
    UPDATE orders
    SET admin_notes = ?,
        updated_at = ?
    WHERE order_id = ?
  `
  ).run(cleaned.length > 0 ? cleaned : null, now, orderId);

  const updated = getOrderById(orderId);
  if (!updated) {
    return { ok: false, status: 500, error: 'Failed to reload updated order.' };
  }

  return { ok: true, order: updated };
}
