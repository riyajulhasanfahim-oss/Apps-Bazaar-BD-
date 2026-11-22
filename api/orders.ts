import crypto from 'node:crypto';
import fs from 'node:fs';
import { validateOrderInput } from '../shared/orderValidation';

const PRODUCT_NAME = 'Ad Earning';
const AUTHORITATIVE_PRICE = 999;
const CURRENCY = 'BDT';
const TMP_ORDERS_FILE = '/tmp/apps-bazaar-orders.json';

interface StoredOrder {
  orderId: string;
  userId: string;
  invoiceRef: string;
  customerName: string;
  productName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  senderNumber: string;
  transactionId: string;
  whatsappNumber: string;
  imoNumber: string | null;
  submittedAt: string;
  paymentStatus: string;
  orderStatus: string;
}

const inMemoryTxKeys = new Set<string>();

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

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

function txKey(paymentMethod: string, transactionId: string): string {
  return `${paymentMethod}:${transactionId}`;
}

function readTmpOrders(): StoredOrder[] {
  try {
    if (!fs.existsSync(TMP_ORDERS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(TMP_ORDERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredOrder[]) : [];
  } catch {
    return [];
  }
}

function writeTmpOrders(orders: StoredOrder[]): void {
  try {
    fs.writeFileSync(TMP_ORDERS_FILE, JSON.stringify(orders), 'utf8');
  } catch {
    // Graceful no-op if /tmp cannot be written in a restricted runtime
  }
}

export async function POST(request: Request): Promise<Response> {
  let rawBody: unknown = {};
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse(
      { error: 'অনুগ্রহ করে সব প্রয়োজনীয় তথ্য সঠিকভাবে পূরণ করুন।' },
      400
    );
  }

  const body =
    rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : {};
  const validation = validateOrderInput(body);

  if (!validation.valid || !validation.sanitized) {
    return jsonResponse(
      {
        error: 'অনুগ্রহ করে সব প্রয়োজনীয় তথ্য সঠিকভাবে পূরণ করুন।',
        fieldErrors: validation.errors,
      },
      400
    );
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

  const key = txKey(paymentMethod, transactionId);
  const existingOrders = readTmpOrders();
  const duplicateInTmp = existingOrders.some(
    (order) =>
      order.paymentMethod === paymentMethod &&
      String(order.transactionId).toUpperCase() === transactionId
  );

  if (inMemoryTxKeys.has(key) || duplicateInTmp) {
    return jsonResponse(
      {
        error:
          'এই Transaction ID দিয়ে ইতিমধ্যেই একটি পেমেন্ট রিকুয়েস্ট জমা দেওয়া হয়েছে। অনুগ্রহ করে অ্যাডমিন ভেরিফিকেশনের জন্য অপেক্ষা করুন।',
        fieldErrors: {
          transactionId: 'Duplicate Transaction ID detected.',
        },
      },
      409
    );
  }

  const orderId = generateOrderId();
  const resolvedUserId = userId ?? generateUserId();
  const submittedAt = new Date().toISOString();

  const order: StoredOrder = {
    orderId,
    userId: resolvedUserId,
    invoiceRef: invoiceRef ?? orderId,
    customerName,
    productName: PRODUCT_NAME,
    amount: AUTHORITATIVE_PRICE,
    currency: CURRENCY,
    paymentMethod,
    senderNumber,
    transactionId,
    whatsappNumber,
    imoNumber,
    submittedAt,
    paymentStatus: 'Pending Verification',
    orderStatus: 'Pending',
  };

  inMemoryTxKeys.add(key);
  existingOrders.push(order);
  writeTmpOrders(existingOrders);

  return jsonResponse({ order }, 201);
}
