import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Copy,
  Headphones,
  Home,
  Info,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  isValidBdPhone,
  normalizeBdPhone,
  validateOrderInput,
  type OrderFieldErrors,
  type PaymentMethodName,
} from '../../shared/orderValidation';
import { DEFAULT_PAYMENT_METHODS } from '../../shared/paymentMethods';
import {
  PAYMENT_BRAND_THEMES,
  PRICING_CONFIG,
  type PublicPaymentMethod,
} from '../data/paymentConfig';
import { AppsBazaarLogo, PaymentMethodLogo } from './PaymentBrandLogo';

type CheckoutStep = 'details' | 'method' | 'instructions' | 'success';
type GatewayTab = 'support' | 'mobile_banking' | 'info';

interface SubmittedOrder {
  orderId: string;
  userId: string;
  invoiceRef: string | null;
  customerName: string;
  productName: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodName;
  senderNumber: string;
  transactionId: string;
  whatsappNumber: string;
  imoNumber: string | null;
  submittedAt: string;
  paymentStatus: string;
  orderStatus: string;
}

interface BuyNowModalProps {
  onClose: () => void;
}

function generateSessionRef(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${code}`;
}

export function BuyNowModal({ onClose }: BuyNowModalProps) {
  const [step, setStep] = useState<CheckoutStep>('details');
  const [activeTab, setActiveTab] = useState<GatewayTab>('mobile_banking');

  // Dynamic payment methods fetched from SQLite via /api/payment-methods
  const [paymentMethods, setPaymentMethods] = useState<PublicPaymentMethod[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [methodsError, setMethodsError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodName>('bKash');

  // Session identifiers for Invoice / User ID display & persistence
  const [userId] = useState(() => generateSessionRef('USR'));
  const [invoiceRef] = useState(() => generateSessionRef('AB'));

  // Customer Details Form
  const [customerName, setCustomerName] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [imoNumber, setImoNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const [fieldErrors, setFieldErrors] = useState<OrderFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(null);

  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const loadPaymentMethods = useCallback(async (signal?: AbortSignal) => {
    setIsLoadingMethods(true);
    setMethodsError(null);

    const applyMethods = (methods: PublicPaymentMethod[]) => {
      setPaymentMethods(methods);
      if (methods.length > 0) {
        setSelectedMethod((prev) =>
          methods.some((m) => m.id === prev) ? prev : methods[0].id
        );
      }
    };

    try {
      const res = await fetch('/api/payment-methods', { signal });
      const contentType = res.headers.get('content-type') ?? '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await res.json().catch(() => null) : null;

      // Static/Vercel SPA hosting without Express /api returns 404 or HTML fallback;
      // use the built-in shared configuration instead of failing checkout.
      if (res.status === 404 || !isJson) {
        applyMethods(DEFAULT_PAYMENT_METHODS);
        return;
      }

      if (!res.ok || !Array.isArray(data?.methods)) {
        setMethodsError('Unable to load mobile banking options. Please try again.');
        return;
      }

      applyMethods(data.methods as PublicPaymentMethod[]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      applyMethods(DEFAULT_PAYMENT_METHODS);
    } finally {
      if (!signal?.aborted) {
        setIsLoadingMethods(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadPaymentMethods(controller.signal);
    return () => controller.abort();
  }, [loadPaymentMethods]);

  const activePaymentMethod =
    paymentMethods.find((m) => m.id === selectedMethod) ?? paymentMethods[0] ?? null;

  const activeTheme = PAYMENT_BRAND_THEMES[selectedMethod];

  const clearFieldError = (field: keyof OrderFieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleCopyNumber = async () => {
    if (!activePaymentMethod) return;
    try {
      await navigator.clipboard.writeText(activePaymentMethod.accountNumber.replace(/-/g, ''));
      setCopiedNumber(true);
      window.setTimeout(() => setCopiedNumber(false), 1800);
    } catch {
      setCopiedNumber(false);
    }
  };

  const handleCopyOrderId = async (orderId: string) => {
    try {
      await navigator.clipboard.writeText(orderId);
      setCopiedOrderId(true);
      window.setTimeout(() => setCopiedOrderId(false), 1800);
    } catch {
      setCopiedOrderId(false);
    }
  };

  const handleContinueToGateway = (e: FormEvent) => {
    e.preventDefault();
    const errors: OrderFieldErrors = {};

    const trimmedName = customerName.trim();
    const trimmedSender = senderNumber.trim();
    const trimmedWhatsapp = whatsappNumber.trim();
    const trimmedImo = imoNumber.trim();

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      errors.customerName = 'Please enter your full name (2–80 characters).';
    }
    if (!trimmedSender) {
      errors.senderNumber = 'Please enter your mobile banking sender number.';
    } else if (!isValidBdPhone(trimmedSender)) {
      errors.senderNumber = 'Enter a valid Bangladesh mobile number (e.g., 017XXXXXXXX).';
    }
    if (!trimmedWhatsapp) {
      errors.whatsappNumber = 'Please enter your active WhatsApp number for delivery.';
    } else if (!isValidBdPhone(trimmedWhatsapp)) {
      errors.whatsappNumber = 'Enter a valid Bangladesh WhatsApp number (e.g., 017XXXXXXXX).';
    }
    if (trimmedImo.length > 0 && !isValidBdPhone(trimmedImo)) {
      errors.imoNumber = 'Enter a valid Bangladesh IMO number (e.g., 017XXXXXXXX) or leave blank.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitError(null);
    setActiveTab('mobile_banking');
    setStep('method');
  };

  const handleRequestNow = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);

    const validation = validateOrderInput({
      customerName,
      paymentMethod: selectedMethod,
      senderNumber,
      transactionId,
      whatsappNumber,
      imoNumber,
      userId,
      invoiceRef,
      paymentConfirmed: true,
    });

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      if (
        validation.errors.customerName ||
        validation.errors.senderNumber ||
        validation.errors.whatsappNumber ||
        validation.errors.imoNumber
      ) {
        setStep('details');
      }
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName,
          paymentMethod: selectedMethod,
          senderNumber,
          transactionId,
          whatsappNumber,
          imoNumber,
          userId,
          invoiceRef,
          paymentConfirmed: true,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
          setFieldErrors(data.fieldErrors as OrderFieldErrors);
        }
        setSubmitError(
          typeof data?.error === 'string'
            ? data.error
            : 'পেমেন্ট রিকুয়েস্ট জমা দেওয়া যায়নি। অনুগ্রহ করে তথ্য যাচাই করে আবার চেষ্টা করুন।'
        );
        return;
      }

      if (!data?.order?.orderId) {
        setSubmitError('Unexpected server response. Please try again.');
        return;
      }

      setSubmittedOrder(data.order as SubmittedOrder);
      setStep('success');
    } catch {
      setSubmitError(
        'নেটওয়ার্ক সমস্যার কারণে অর্ডার সেভ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* STEP 1: COMPACT CUSTOMER DETAILS -> "Connecting Payment"                   */
  /* -------------------------------------------------------------------------- */
  if (step === 'details') {
    return (
      <div className="bg-[#F8FAFC] p-3 sm:p-3.5">
        <div className="bg-white rounded-xl border border-slate-200/85 px-2.5 py-1.5 mb-2.5 flex items-center justify-between shadow-2xs">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to store home"
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4" />
          </button>
          <div className="text-center leading-tight">
            <div className="font-display text-[13.5px] font-bold text-[#1F1F1F]">
              {PRICING_CONFIG.productName} · {PRICING_CONFIG.currencySymbol}
              {PRICING_CONFIG.currentPrice}.00
            </div>
            <div className="text-[10.5px] text-[#5F6368]">Order &amp; Contact Information</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleContinueToGateway} noValidate className="space-y-2.5">
          {/* Compact Order Summary Strip */}
          <div className="bg-white rounded-xl border border-slate-200/85 px-3 py-2 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <AppsBazaarLogo className="w-8 h-8 shrink-0" />
              <div className="min-w-0">
                <div className="font-display font-bold text-[13px] text-[#1F1F1F] truncate">
                  {PRICING_CONFIG.brandName}
                </div>
                <div className="text-[10.5px] text-[#5F6368] truncate">
                  {PRICING_CONFIG.paymentForLabel}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] text-slate-400 line-through tabular-nums leading-none">
                {PRICING_CONFIG.currencySymbol}
                {PRICING_CONFIG.previousPrice}
              </div>
              <div className="font-display font-extrabold text-[15.5px] text-[#1A73E8] tabular-nums leading-tight">
                {PRICING_CONFIG.currencySymbol}
                {PRICING_CONFIG.currentPrice}.00
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/85 p-3 space-y-2.5">
            <div>
              <label
                htmlFor="checkout-customer-name"
                className="block text-[11.5px] font-semibold text-[#3C4043] mb-1"
              >
                Customer Name <span className="text-[#D93025]">*</span>
              </label>
              <input
                id="checkout-customer-name"
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  clearFieldError('customerName');
                }}
                placeholder="Enter your full name"
                autoComplete="name"
                className={`w-full px-3 py-2 rounded-lg border text-[13px] text-[#1F1F1F] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/25 ${
                  fieldErrors.customerName
                    ? 'border-[#D93025]'
                    : 'border-slate-200 focus:border-[#1A73E8]'
                }`}
              />
              {fieldErrors.customerName && (
                <p className="mt-0.5 text-[11px] text-[#D93025]">{fieldErrors.customerName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="checkout-sender-number"
                className="block text-[11.5px] font-semibold text-[#3C4043] mb-1"
              >
                Payment Sender Number <span className="text-[#D93025]">*</span>
              </label>
              <input
                id="checkout-sender-number"
                type="tel"
                inputMode="tel"
                value={senderNumber}
                onChange={(e) => {
                  setSenderNumber(e.target.value);
                  clearFieldError('senderNumber');
                }}
                placeholder="017XXXXXXXX"
                className={`w-full px-3 py-2 rounded-lg border text-[13px] text-[#1F1F1F] bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/25 ${
                  fieldErrors.senderNumber
                    ? 'border-[#D93025]'
                    : 'border-slate-200 focus:border-[#1A73E8]'
                }`}
              />
              {fieldErrors.senderNumber && (
                <p className="mt-0.5 text-[11px] text-[#D93025]">{fieldErrors.senderNumber}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <label
                    htmlFor="checkout-whatsapp-number"
                    className="block text-[11.5px] font-semibold text-[#3C4043] truncate"
                  >
                    WhatsApp <span className="text-[#D93025]">*</span>
                  </label>
                  {isValidBdPhone(senderNumber) && !whatsappNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        setWhatsappNumber(normalizeBdPhone(senderNumber));
                        clearFieldError('whatsappNumber');
                      }}
                      className="text-[10px] font-semibold text-[#1A73E8] hover:underline cursor-pointer shrink-0"
                    >
                      Same
                    </button>
                  )}
                </div>
                <input
                  id="checkout-whatsapp-number"
                  type="tel"
                  inputMode="tel"
                  value={whatsappNumber}
                  onChange={(e) => {
                    setWhatsappNumber(e.target.value);
                    clearFieldError('whatsappNumber');
                  }}
                  placeholder="017XXXXXXXX"
                  className={`w-full px-2.5 py-2 rounded-lg border text-[12.5px] text-[#1F1F1F] bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/25 ${
                    fieldErrors.whatsappNumber
                      ? 'border-[#D93025]'
                      : 'border-slate-200 focus:border-[#1A73E8]'
                  }`}
                />
                {fieldErrors.whatsappNumber && (
                  <p className="mt-0.5 text-[10.5px] text-[#D93025] leading-tight">
                    {fieldErrors.whatsappNumber}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="checkout-imo-number"
                  className="block text-[11.5px] font-semibold text-[#3C4043] mb-1 truncate"
                >
                  IMO <span className="text-[#5F6368] font-normal">(Optional)</span>
                </label>
                <input
                  id="checkout-imo-number"
                  type="tel"
                  inputMode="tel"
                  value={imoNumber}
                  onChange={(e) => {
                    setImoNumber(e.target.value);
                    clearFieldError('imoNumber');
                  }}
                  placeholder="017XXXXXXXX"
                  className={`w-full px-2.5 py-2 rounded-lg border text-[12.5px] text-[#1F1F1F] bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/25 ${
                    fieldErrors.imoNumber
                      ? 'border-[#D93025]'
                      : 'border-slate-200 focus:border-[#1A73E8]'
                  }`}
                />
                {fieldErrors.imoNumber && (
                  <p className="mt-0.5 text-[10.5px] text-[#D93025] leading-tight">
                    {fieldErrors.imoNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[42px] px-4 py-2.5 rounded-xl bg-[#1A73E8] hover:bg-[#0D5BD9] text-white font-display font-bold text-[14px] shadow-[0_4px_12px_rgba(26,115,232,0.28)] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Connecting Payment</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[10.5px] text-[#5F6368] flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#188038]" />
            <span>Secured by {PRICING_CONFIG.brandName}</span>
          </p>
        </form>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* STEP 2: COMPACT PAYMENT METHOD SELECTION GATEWAY                           */
  /* -------------------------------------------------------------------------- */
  if (step === 'method') {
    return (
      <div className="bg-[#F8FAFC] p-3 sm:p-3.5 space-y-2.5">
        {/* Compact Top Bar */}
        <div className="bg-white rounded-xl border border-slate-200/85 px-2.5 py-1.5 flex items-center justify-between shadow-2xs">
          <button
            type="button"
            onClick={onClose}
            aria-label="Return to storefront"
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setStep('details')}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1A73E8] hover:bg-blue-50 px-2 py-1 rounded-full cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Edit Contact</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment modal"
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Centered Brand Logo, Name & 3 Tabs */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-white border border-slate-200/85 shadow-2xs flex items-center justify-center p-1">
              <AppsBazaarLogo className="w-7 h-7" />
            </div>
            <h3 className="font-display text-[15px] font-extrabold tracking-tight text-[#1F1F1F]">
              {PRICING_CONFIG.brandName}
            </h3>
          </div>

          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('support')}
              aria-label="Payment Support"
              aria-pressed={activeTab === 'support'}
              className={`w-9 h-8 rounded-lg border bg-white flex items-center justify-center transition-all cursor-pointer ${
                activeTab === 'support'
                  ? 'border-[#1A73E8] ring-2 ring-[#1A73E8]/20 text-[#1A73E8]'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Headphones className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mobile_banking')}
              aria-label="Mobile Banking Options"
              aria-pressed={activeTab === 'mobile_banking'}
              style={
                activeTab === 'mobile_banking' && activePaymentMethod
                  ? {
                      borderColor: activeTheme.primaryHex,
                      color: activeTheme.primaryHex,
                      boxShadow: `0 0 0 2px ${activeTheme.badgeBgHex}`,
                    }
                  : undefined
              }
              className={`w-9 h-8 rounded-lg border bg-white flex items-center justify-center transition-all cursor-pointer ${
                activeTab === 'mobile_banking'
                  ? 'border-[#1A73E8]'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('info')}
              aria-label="Order Information"
              aria-pressed={activeTab === 'info'}
              className={`w-9 h-8 rounded-lg border bg-white flex items-center justify-center transition-all cursor-pointer ${
                activeTab === 'info'
                  ? 'border-[#1A73E8] ring-2 ring-[#1A73E8]/20 text-[#1A73E8]'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB 1: SUPPORT */}
        {activeTab === 'support' && (
          <div className="bg-white rounded-xl border border-slate-200/85 overflow-hidden shadow-2xs">
            <div className="bg-[#0F172A] text-white text-center py-2 px-3 font-display font-bold text-[12.5px]">
              সাপোর্ট ও পেমেন্ট সহায়তা
            </div>
            <div className="p-3 space-y-2 text-[12px] text-[#374151] leading-relaxed">
              <p>
                আপনার <strong>{PRICING_CONFIG.productName}</strong> অর্ডারের পেমেন্ট যাচাই ও
                ডেলিভারি সাপোর্ট সাধারণত <strong>১–২ ঘণ্টার</strong> মধ্যে সম্পন্ন হয়।
              </p>
              <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 space-y-1 text-[11.5px]">
                <div className="flex justify-between">
                  <span className="text-[#5F6368]">WhatsApp</span>
                  <span className="font-mono font-semibold text-[#1F1F1F]">
                    {normalizeBdPhone(whatsappNumber)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5F6368]">Invoice ID</span>
                  <span className="font-mono font-semibold text-[#1A73E8]">{invoiceRef}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('mobile_banking')}
                className="w-full py-1.5 rounded-lg bg-blue-50 text-[#1A73E8] font-display font-semibold text-[12px] hover:bg-blue-100 cursor-pointer transition-colors"
              >
                Mobile Banking পেমেন্টে ফিরে যান
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MOBILE BANKING (COMPACT 2-COL GRID) */}
        {activeTab === 'mobile_banking' && (
          <div className="space-y-2">
            <div className="bg-[#0F172A] text-white rounded-lg px-3 py-1.5 flex items-center justify-between">
              <span className="font-display font-bold text-[12.5px]">Mobile Banking</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-bold tracking-wider">
                LIVE
              </span>
            </div>

            {isLoadingMethods ? (
              <div className="bg-white rounded-xl border border-slate-200/85 py-8 flex flex-col items-center justify-center gap-1.5 text-[#5F6368]">
                <Loader2 className="w-5 h-5 animate-spin text-[#1A73E8]" />
                <span className="text-[12px]">Loading payment methods...</span>
              </div>
            ) : methodsError || paymentMethods.length === 0 ? (
              <div className="bg-white rounded-xl border border-red-200 p-3 text-center space-y-2">
                <AlertCircle className="w-5 h-5 text-red-600 mx-auto" />
                <p className="text-[12px] text-red-700">
                  {methodsError ?? 'No active mobile banking methods available.'}
                </p>
                <button
                  type="button"
                  onClick={() => loadPaymentMethods()}
                  className="px-3 py-1 rounded-full bg-red-50 text-red-700 font-semibold text-[11.5px] inline-flex items-center gap-1 hover:bg-red-100 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => {
                  const theme = PAYMENT_BRAND_THEMES[method.id];
                  const isSelected = method.id === selectedMethod;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setCopiedNumber(false);
                        setSubmitError(null);
                      }}
                      aria-pressed={isSelected}
                      style={{
                        borderColor: isSelected ? theme.primaryHex : undefined,
                        backgroundColor: isSelected ? theme.softTintBg : '#FFFFFF',
                        boxShadow: isSelected
                          ? `0 4px 12px ${theme.shadowRgba}`
                          : undefined,
                      }}
                      className={`relative rounded-xl border-2 px-2.5 py-2 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[78px] ${
                        isSelected ? '' : 'border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[8.5px] font-bold tracking-wider leading-none">
                          LIVE
                        </span>

                        {isSelected ? (
                          <span
                            style={{ backgroundColor: theme.primaryHex }}
                            className="w-4 h-4 rounded-full text-white flex items-center justify-center shrink-0 shadow-xs"
                          >
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-200 shrink-0" />
                        )}
                      </div>

                      <div className="my-1.5 flex items-center justify-center">
                        <PaymentMethodLogo method={method.id} variant="card" />
                      </div>

                      <div className="text-center">
                        <div
                          style={isSelected ? { color: theme.accentTextHex } : undefined}
                          className="font-display font-bold text-[11.5px] text-[#1F1F1F] leading-tight truncate"
                        >
                          {method.displayName}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ORDER INFO / সাধারণ তথ্য */}
        {activeTab === 'info' && (
          <div className="bg-white rounded-xl border border-slate-200/85 overflow-hidden shadow-2xs">
            <div className="bg-[#0F172A] text-white text-center py-2 px-3 font-display font-bold text-[12.5px]">
              সাধারণ তথ্য
            </div>
            <div className="divide-y divide-slate-100 px-3 text-[12px]">
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-[#5F6368]">Merchant</span>
                <span className="font-display font-bold text-[#1F1F1F]">
                  {PRICING_CONFIG.brandName}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-[#5F6368]">Invoice ID</span>
                <span className="font-mono font-bold text-[#1F1F1F]">{invoiceRef}</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-[#5F6368]">User ID</span>
                <span className="font-mono font-semibold text-[#1F1F1F]">{userId}</span>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-[#5F6368]">Payable Amount</span>
                <span className="font-display font-extrabold text-[#1F1F1F] tabular-nums">
                  {PRICING_CONFIG.currencySymbol}
                  {PRICING_CONFIG.currentPrice}.00
                </span>
              </div>
              <div className="py-2 flex items-center justify-between gap-2">
                <span className="text-[#5F6368]">Payment For</span>
                <span className="font-semibold text-[#1F1F1F] text-right">
                  {PRICING_CONFIG.paymentForLabel}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Compact Footer: Secured by + Brand-Styled Pay Button */}
        <div className="pt-0.5 space-y-2">
          <div className="flex items-center justify-center gap-1 text-[11px] text-[#4B5563]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#188038]" />
            <span>Secured by {PRICING_CONFIG.brandName}</span>
          </div>

          <button
            type="button"
            disabled={!activePaymentMethod || isLoadingMethods}
            onClick={() => {
              if (!activePaymentMethod) return;
              setSubmitError(null);
              setStep('instructions');
            }}
            style={
              activePaymentMethod
                ? {
                    background: activeTheme.buttonGradient,
                    boxShadow: `0 6px 16px ${activeTheme.shadowRgba}`,
                  }
                : undefined
            }
            className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#1A73E8] disabled:opacity-55 disabled:cursor-not-allowed text-white font-display font-bold text-[14px] hover:brightness-95 transition-all cursor-pointer"
          >
            Pay {PRICING_CONFIG.currencySymbol}
            {PRICING_CONFIG.currentPrice}.00 via {selectedMethod}
          </button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* STEP 3: COMPACT BRANDED PAYMENT INSTRUCTION & TRXID SCREEN                 */
  /* -------------------------------------------------------------------------- */
  if (step === 'instructions' && activePaymentMethod) {
    const cleanPhoneDisplay = activePaymentMethod.accountNumber;
    const rawInstructions = activePaymentMethod.instructions;

    return (
      <div className="bg-[#F6F8FC]">
        {/* Brand-Colored Top Header Bar */}
        <div
          style={{ background: activeTheme.headerGradient }}
          className="px-3 py-2 text-white flex items-center justify-between shadow-xs"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Return to storefront"
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4" />
          </button>

          <div className="text-center leading-tight">
            <div className="font-display font-bold text-[13.5px]">
              {activePaymentMethod.displayName}
            </div>
            <div className="text-[10.5px] text-white/90">
              Send Money · {PRICING_CONFIG.currencySymbol}
              {PRICING_CONFIG.currentPrice}.00
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSubmitError(null);
              setStep('method');
            }}
            aria-label="Back to payment methods"
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 sm:p-3.5 space-y-2.5">
          {/* Compact Merchant/Invoice + Selected Brand Logo Row */}
          <div className="grid grid-cols-[1.45fr_1fr] gap-2">
            <div className="bg-white rounded-xl border border-slate-200/85 px-2.5 py-2 flex items-center gap-2 shadow-2xs min-w-0">
              <AppsBazaarLogo className="w-7 h-7 shrink-0" />
              <div className="min-w-0 leading-tight">
                <div className="font-display font-bold text-[12px] text-[#1F1F1F] truncate">
                  {PRICING_CONFIG.brandName}
                </div>
                <div className="text-[10.5px] truncate mt-0.5">
                  <span style={{ color: activeTheme.accentTextHex }} className="font-semibold">
                    Invoice:
                  </span>{' '}
                  <span className="font-mono font-semibold text-[#3C4043]">{invoiceRef}</span>
                </div>
              </div>
            </div>

            <div
              style={{ borderColor: activeTheme.softBorderHex }}
              className="bg-white rounded-xl border px-2 py-2 flex items-center justify-center shadow-2xs"
            >
              <PaymentMethodLogo method={activePaymentMethod.id} variant="card" />
            </div>
          </div>

          <form onSubmit={handleRequestNow} noValidate className="space-y-2.5">
            {/* Compact Vibrant Brand-Colored TrxID Card */}
            <div
              style={{
                background: activeTheme.panelGradient,
                boxShadow: `0 6px 16px ${activeTheme.shadowRgba}`,
              }}
              className="rounded-xl p-3 text-white"
            >
              <label
                htmlFor="gateway-transaction-id"
                className="block text-center font-display font-bold text-[13.5px] mb-2"
              >
                ট্রানজেকশন আইডি দিন
              </label>

              <input
                id="gateway-transaction-id"
                type="text"
                value={transactionId}
                onChange={(e) => {
                  setTransactionId(e.target.value);
                  clearFieldError('transactionId');
                }}
                placeholder="যেমন: BKH8A92K10"
                autoComplete="off"
                className={`w-full px-3 py-2 rounded-lg bg-white text-[#1F1F1F] placeholder:text-slate-400 text-center font-mono font-bold text-[13.5px] uppercase shadow-inner focus:outline-none focus:ring-2 focus:ring-white/90 ${
                  fieldErrors.transactionId ? 'ring-2 ring-yellow-300' : ''
                }`}
              />

              {fieldErrors.transactionId && (
                <div
                  role="alert"
                  className="mt-1.5 rounded-lg bg-black/25 px-2.5 py-1 text-[11px] font-semibold text-[#FEF08A] text-center"
                >
                  {fieldErrors.transactionId}
                </div>
              )}
            </div>

            {/* Compact, High-Readability Brand-Themed Payment Details & Instructions Panel */}
            <div
              style={{ borderColor: activeTheme.softBorderHex }}
              className="bg-white rounded-xl border overflow-hidden shadow-2xs"
            >
              {/* Highlighted Number + Copy + Amount Banner */}
              <div
                style={{
                  backgroundColor: activeTheme.softTintBg,
                  borderColor: activeTheme.softBorderHex,
                }}
                className="px-3 py-2.5 border-b space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 leading-tight">
                    <div className="text-[10.5px] font-medium text-[#4B5563]">
                      প্রাপক {activePaymentMethod.displayName} নম্বরঃ
                    </div>
                    <div
                      style={{ color: activeTheme.accentTextHex }}
                      className="font-mono font-extrabold text-[15px] tracking-wide tabular-nums mt-0.5"
                    >
                      {cleanPhoneDisplay}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    style={{
                      backgroundColor: copiedNumber ? '#16A34A' : activeTheme.primaryHex,
                    }}
                    className="px-3 py-1.5 rounded-lg text-white text-[11.5px] font-semibold inline-flex items-center gap-1 hover:brightness-95 cursor-pointer shrink-0 transition-all shadow-2xs"
                  >
                    {copiedNumber ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-black/5 text-[12px]">
                  <span className="font-medium text-[#374151]">টাকার পরিমাণঃ</span>
                  <span
                    style={{
                      backgroundColor: activeTheme.badgeBgHex,
                      color: activeTheme.accentTextHex,
                    }}
                    className="px-2 py-0.5 rounded-md font-display font-extrabold text-[13px] tabular-nums"
                  >
                    {PRICING_CONFIG.currencySymbol}
                    {PRICING_CONFIG.currentPrice}.00 ({PRICING_CONFIG.currency})
                  </span>
                </div>
              </div>

              {/* Compact Instruction List */}
              <div className="px-3 py-2 divide-y divide-slate-100 text-[11.5px] leading-snug text-[#374151]">
                {rawInstructions.map((line, idx) => (
                  <div key={`step-${idx}`} className="py-1.5 flex items-start gap-1.5">
                    <span
                      style={{ color: activeTheme.accentTextHex }}
                      className="font-bold shrink-0"
                    >
                      •
                    </span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            {submitError && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-[11.5px] text-red-700 flex items-start gap-1.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Compact Prominent Brand-Colored Request Now Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: activeTheme.buttonGradient,
                boxShadow: `0 6px 16px ${activeTheme.shadowRgba}`,
              }}
              className="w-full min-h-[42px] px-4 py-2.5 rounded-xl text-white font-display font-bold text-[14px] tracking-wide uppercase hover:brightness-95 disabled:opacity-65 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <span>Request Now</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* STEP 4: COMPACT POST-SUBMISSION SUCCESS SCREEN (AFTER DB CONFIRMATION)     */
  /* -------------------------------------------------------------------------- */
  if (step === 'success' && submittedOrder) {
    const orderTheme = PAYMENT_BRAND_THEMES[submittedOrder.paymentMethod];

    return (
      <div className="bg-[#F8FAFC] p-3.5 sm:p-4 space-y-3">
        {/* Green Success Header + Exact Bengali Message */}
        <div className="rounded-2xl bg-emerald-50/90 border border-emerald-200/90 p-3.5 text-center space-y-2">
          <div className="w-11 h-11 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-[#16A34A]" aria-hidden="true" />
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-emerald-200 text-[10.5px] font-semibold text-emerald-700">
            <Clock className="w-3 h-3 text-amber-600" aria-hidden="true" />
            <span>Request Submitted · {submittedOrder.paymentStatus}</span>
          </div>

          <h4 className="font-display text-[15px] font-extrabold text-[#14532D] leading-snug">
            পেমেন্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে!
          </h4>

          <p className="text-[12px] leading-relaxed text-[#1F2937] text-left">
            আপনি যদি সত্যিই পেমেন্ট সম্পন্ন করে থাকেন, তাহলে কিছুক্ষণের মধ্যে আমাদের অ্যাডমিন টিম
            আপনার IMO অথবা WhatsApp-এ যোগাযোগ করবে। যোগাযোগের সময় আপনাকে অ্যাডমিন প্যানেলসহ
            সম্পূর্ণ সিস্টেম ব্যবহারের নিয়ম বুঝিয়ে দেওয়া হবে। এজন্য অনুগ্রহ করে ১–২ ঘণ্টা অপেক্ষা
            করুন এবং IMO অথবা WhatsApp-এ সক্রিয় থাকুন, যাতে আমাদের টিম সহজেই আপনার সঙ্গে যোগাযোগ
            করতে পারে।
          </p>

          <p className="text-[12px] font-bold text-[#15803D]">
            ধন্যবাদ আমাদের সার্ভিস গ্রহণ করার জন্য।
          </p>
        </div>

        {/* Compact Order / Invoice / Payment Method Summary */}
        <div className="rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 space-y-1.5 text-[12px]">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
            <span className="text-[#5F6368]">Order ID</span>
            <button
              type="button"
              onClick={() => handleCopyOrderId(submittedOrder.orderId)}
              className="inline-flex items-center gap-1 font-mono font-bold text-[#1F1F1F] hover:text-[#1A73E8] cursor-pointer"
              title="Copy Order ID"
            >
              <span>{submittedOrder.orderId}</span>
              {copiedOrderId ? (
                <Check className="w-3.5 h-3.5 text-[#16A34A]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>

          {submittedOrder.invoiceRef && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#5F6368]">Invoice ID</span>
              <span className="font-mono font-semibold text-[#1F1F1F]">
                {submittedOrder.invoiceRef}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-[#5F6368]">Payment Method</span>
            <span
              style={{
                backgroundColor: orderTheme.badgeBgHex,
                color: orderTheme.accentTextHex,
              }}
              className="px-2 py-0.5 rounded-md font-display font-bold text-[11.5px]"
            >
              {submittedOrder.paymentMethod}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[#5F6368]">Amount &amp; TrxID</span>
            <span className="font-mono font-semibold text-[#1F1F1F] tabular-nums">
              {PRICING_CONFIG.currencySymbol}
              {submittedOrder.amount}.00 · {submittedOrder.transactionId}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[42px] rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-display font-bold text-[13.5px] transition-colors cursor-pointer shadow-sm"
        >
          Done / Close
        </button>
      </div>
    );
  }

  return null;
}
