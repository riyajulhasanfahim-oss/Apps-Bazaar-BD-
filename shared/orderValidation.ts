export const ALLOWED_PAYMENT_METHODS = ['bKash', 'Nagad', 'Rocket', 'Upay'] as const;

export type PaymentMethodName = (typeof ALLOWED_PAYMENT_METHODS)[number];

export interface OrderRequestInput {
  customerName: string;
  paymentMethod: string;
  senderNumber: string;
  transactionId: string;
  whatsappNumber: string;
  imoNumber?: string;
  userId?: string;
  invoiceRef?: string;
  paymentConfirmed: boolean;
}

export interface OrderFieldErrors {
  customerName?: string;
  paymentMethod?: string;
  senderNumber?: string;
  transactionId?: string;
  whatsappNumber?: string;
  imoNumber?: string;
  paymentConfirmed?: string;
}

/**
 * Normalizes Bangladesh mobile phone numbers into standard 11-digit 01XXXXXXXXX format.
 * Accepts: 017XXXXXXXX, +88017XXXXXXXX, 88017XXXXXXXX (ignoring spaces/hyphens).
 */
export function normalizeBdPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (cleaned.startsWith('+880')) {
    return `0${cleaned.slice(4)}`;
  }
  if (cleaned.startsWith('880') && cleaned.length === 13) {
    return `0${cleaned.slice(3)}`;
  }
  return cleaned;
}

/**
 * Validates standard Bangladesh mobile phone number format: 01[3-9] + 8 digits (11 digits total).
 */
export function isValidBdPhone(raw: string): boolean {
  const normalized = normalizeBdPhone(raw);
  return /^01[3-9]\d{8}$/.test(normalized);
}

export function isValidPaymentMethod(method: string): method is PaymentMethodName {
  return (ALLOWED_PAYMENT_METHODS as readonly string[]).includes(method);
}

export function validateOrderInput(input: Partial<OrderRequestInput>): {
  valid: boolean;
  errors: OrderFieldErrors;
  sanitized?: {
    customerName: string;
    paymentMethod: PaymentMethodName;
    senderNumber: string;
    transactionId: string;
    whatsappNumber: string;
    imoNumber: string | null;
    userId: string | null;
    invoiceRef: string | null;
    paymentConfirmed: true;
  };
} {
  const errors: OrderFieldErrors = {};

  const customerName = typeof input.customerName === 'string' ? input.customerName.trim() : '';
  const paymentMethod = typeof input.paymentMethod === 'string' ? input.paymentMethod.trim() : '';
  const senderRaw = typeof input.senderNumber === 'string' ? input.senderNumber.trim() : '';
  const trxRaw = typeof input.transactionId === 'string' ? input.transactionId.trim() : '';
  const whatsappRaw = typeof input.whatsappNumber === 'string' ? input.whatsappNumber.trim() : '';
  const imoRaw = typeof input.imoNumber === 'string' ? input.imoNumber.trim() : '';
  const userIdRaw = typeof input.userId === 'string' ? input.userId.trim() : '';
  const invoiceRefRaw = typeof input.invoiceRef === 'string' ? input.invoiceRef.trim() : '';
  const paymentConfirmed = input.paymentConfirmed === true;

  if (customerName.length < 2 || customerName.length > 80) {
    errors.customerName = 'Please enter your full name (2–80 characters).';
  }

  if (!isValidPaymentMethod(paymentMethod)) {
    errors.paymentMethod = 'Please select a valid payment method (bKash, Nagad, Rocket, or Upay).';
  }

  if (!senderRaw) {
    errors.senderNumber = 'Please enter the mobile number used to send payment.';
  } else if (!isValidBdPhone(senderRaw)) {
    errors.senderNumber = 'Enter a valid Bangladesh mobile number (e.g., 017XXXXXXXX).';
  }

  const normalizedTrx = trxRaw.toUpperCase().replace(/\s+/g, '');
  if (!normalizedTrx) {
    errors.transactionId = 'অনুগ্রহ করে আপনার Transaction ID লিখুন।';
  } else if (!/^[A-Z0-9_-]{5,32}$/.test(normalizedTrx)) {
    errors.transactionId = 'সঠিক Transaction ID দিন (৫–৩২ অক্ষর বা সংখ্যা)।';
  }

  if (!whatsappRaw) {
    errors.whatsappNumber = 'Please enter your active WhatsApp number for delivery updates.';
  } else if (!isValidBdPhone(whatsappRaw)) {
    errors.whatsappNumber = 'Enter a valid Bangladesh WhatsApp number (e.g., 017XXXXXXXX).';
  }

  let normalizedImo: string | null = null;
  if (imoRaw.length > 0) {
    if (!isValidBdPhone(imoRaw)) {
      errors.imoNumber = 'Enter a valid Bangladesh IMO number (e.g., 017XXXXXXXX) or leave blank.';
    } else {
      normalizedImo = normalizeBdPhone(imoRaw);
    }
  }

  if (!paymentConfirmed) {
    errors.paymentConfirmed = 'Please confirm that you have completed the ৳999 payment.';
  }

  const sanitizedUserId =
    /^[A-Za-z0-9_-]{4,36}$/.test(userIdRaw) ? userIdRaw.toUpperCase() : null;
  const sanitizedInvoiceRef =
    /^[A-Za-z0-9_-]{4,36}$/.test(invoiceRefRaw) ? invoiceRefRaw.toUpperCase() : null;

  if (Object.keys(errors).length > 0 || !isValidPaymentMethod(paymentMethod)) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    sanitized: {
      customerName,
      paymentMethod,
      senderNumber: normalizeBdPhone(senderRaw),
      transactionId: normalizedTrx,
      whatsappNumber: normalizeBdPhone(whatsappRaw),
      imoNumber: normalizedImo,
      userId: sanitizedUserId,
      invoiceRef: sanitizedInvoiceRef,
      paymentConfirmed: true,
    },
  };
}
