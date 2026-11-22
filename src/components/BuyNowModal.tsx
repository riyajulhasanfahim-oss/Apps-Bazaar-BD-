import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  validateOrderInput,
  type OrderFieldErrors,
  type PaymentMethodName,
} from '../../shared/orderValidation';
import { PAYMENT_METHODS, PRICING_CONFIG } from '../data/paymentConfig';

interface SubmittedOrder {
  orderId: string;
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

export function BuyNowModal({ onClose }: BuyNowModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodName>('bKash');
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [imoNumber, setImoNumber] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<OrderFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<SubmittedOrder | null>(null);

  const activePaymentConfig =
    PAYMENT_METHODS.find((m) => m.id === selectedMethod) ?? PAYMENT_METHODS[0];

  const handleCopyNumber = async () => {
    try {
      await navigator.clipboard.writeText(activePaymentConfig.accountNumber.replace(/-/g, ''));
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

  const clearFieldError = (field: keyof OrderFieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
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
      paymentConfirmed,
    });

    if (!validation.valid) {
      setFieldErrors(validation.errors);
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
          paymentConfirmed,
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
            : 'Unable to submit your purchase request. Please check your details and try again.'
        );
        return;
      }

      if (!data?.order?.orderId) {
        setSubmitError('Unexpected server response. Please try again.');
        return;
      }

      setSubmittedOrder(data.order as SubmittedOrder);
    } catch {
      setSubmitError(
        'Network error while saving your order request. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* SUCCESS SCREEN */
  if (submittedOrder) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-blue-50/80 border border-blue-200/80 p-4 text-center">
          <CheckCircle2 className="w-10 h-10 text-[#1A73E8] mx-auto mb-2" />
          <h4 className="font-display text-[16px] font-bold text-[#1F1F1F]">
            Order Request Submitted Successfully
          </h4>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#4B5563]">
            Thank you, {submittedOrder.customerName}. An admin will review and verify your payment
            before delivering the app package.
          </p>
        </div>

        {/* Order Summary Box */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-2.5 text-[13px]">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <span className="text-[#5F6368]">Order ID</span>
            <button
              type="button"
              onClick={() => handleCopyOrderId(submittedOrder.orderId)}
              className="inline-flex items-center gap-1.5 font-mono font-bold text-[#1F1F1F] hover:text-[#1A73E8] cursor-pointer"
              title="Copy Order ID"
            >
              <span>{submittedOrder.orderId}</span>
              {copiedOrderId ? (
                <Check className="w-3.5 h-3.5 text-[#188038]" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[#5F6368]">Amount</span>
            <span className="font-display font-bold text-[#1F1F1F] tabular-nums">
              {PRICING_CONFIG.currencySymbol}
              {submittedOrder.amount} ({submittedOrder.currency})
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[#5F6368]">Payment Status</span>
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{submittedOrder.paymentStatus}</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[#5F6368]">Payment Method &amp; TrxID</span>
            <span className="font-medium text-[#1F1F1F] tabular-nums">
              {submittedOrder.paymentMethod} · {submittedOrder.transactionId}
            </span>
          </div>
        </div>

        {/* Customer Contact Summary */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 space-y-1.5 text-[12.5px]">
          <div className="font-display font-semibold text-[#1F1F1F]">
            Customer Contact Details
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#5F6368]">WhatsApp</span>
            <span className="font-medium text-[#1F1F1F] tabular-nums">
              {submittedOrder.whatsappNumber}
            </span>
          </div>
          {submittedOrder.imoNumber && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#5F6368]">IMO</span>
              <span className="font-medium text-[#1F1F1F] tabular-nums">
                {submittedOrder.imoNumber}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#5F6368]">Sender Number</span>
            <span className="font-medium text-[#1F1F1F] tabular-nums">
              {submittedOrder.senderNumber}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] rounded-full bg-[#1A73E8] hover:bg-[#0D5BD9] text-white font-display font-semibold text-[14px] transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    );
  }

  /* CHECKOUT & PAYMENT FORM */
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Step 4: Exact Purchase Amount Banner */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div>
          <div className="font-display font-bold text-[#1F1F1F] text-[15px]">
            {PRICING_CONFIG.productName} — App Purchase
          </div>
          <div className="text-[12px] text-[#5F6368] mt-0.5">
            Pay {PRICING_CONFIG.currencySymbol}
            {PRICING_CONFIG.currentPrice} ({PRICING_CONFIG.currency}) via mobile banking
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11.5px] text-slate-400 line-through tabular-nums">
            {PRICING_CONFIG.currencySymbol}
            {PRICING_CONFIG.previousPrice}
          </div>
          <div className="font-display text-[20px] font-extrabold text-[#1A73E8] tabular-nums leading-tight">
            {PRICING_CONFIG.currencySymbol}
            {PRICING_CONFIG.currentPrice}
          </div>
        </div>
      </div>

      {/* Step 2: Select Payment Method */}
      <div>
        <label className="block font-display text-[13px] font-semibold text-[#1F1F1F] mb-2">
          1. Select Payment Method
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((method) => {
            const isSelected = method.id === selectedMethod;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  setSelectedMethod(method.id);
                  setCopiedNumber(false);
                  clearFieldError('paymentMethod');
                }}
                aria-pressed={isSelected}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'border-[#1A73E8] bg-blue-50/75 ring-1 ring-[#1A73E8]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span className="font-display text-[13.5px] font-bold text-[#1F1F1F]">
                  {method.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${method.badgeColor}`}
                >
                  {method.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Payment Instructions & Configurable Payment Number */}
      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11.5px] font-medium text-[#5F6368]">
              {activePaymentConfig.name} {activePaymentConfig.accountType}
            </div>
            <div className="font-mono text-[16px] font-bold text-[#1F1F1F] tracking-wide tabular-nums mt-0.5">
              {activePaymentConfig.accountNumber}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyNumber}
            className="min-h-[36px] px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[12px] font-semibold text-[#1A73E8] hover:bg-blue-50 inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            {copiedNumber ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#188038]" />
                <span className="text-[#188038]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <ol className="space-y-1 text-[12px] leading-relaxed text-[#374151] list-decimal list-inside">
          {activePaymentConfig.instructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      {/* Step 5: Payment & Customer Form */}
      <div className="space-y-3">
        <div className="font-display text-[13px] font-semibold text-[#1F1F1F]">
          2. Enter Payment &amp; Contact Details
        </div>

        {/* Customer Name */}
        <div>
          <label
            htmlFor="order-customer-name"
            className="block text-[12px] font-medium text-[#3C4043] mb-1"
          >
            Customer Name <span className="text-[#D93025]">*</span>
          </label>
          <input
            id="order-customer-name"
            type="text"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              clearFieldError('customerName');
            }}
            placeholder="Your full name"
            autoComplete="name"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-[13.5px] text-[#1F1F1F] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 ${
              fieldErrors.customerName ? 'border-[#D93025]' : 'border-slate-200 focus:border-[#1A73E8]'
            }`}
          />
          {fieldErrors.customerName && (
            <p className="mt-1 text-[11.5px] text-[#D93025]">{fieldErrors.customerName}</p>
          )}
        </div>

        {/* Selected Payment Method & Sender Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="order-payment-method"
              className="block text-[12px] font-medium text-[#3C4043] mb-1"
            >
              Selected Method
            </label>
            <input
              id="order-payment-method"
              type="text"
              readOnly
              value={selectedMethod}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13.5px] font-semibold text-[#1F1F1F]"
            />
          </div>

          <div>
            <label
              htmlFor="order-sender-number"
              className="block text-[12px] font-medium text-[#3C4043] mb-1"
            >
              Sender {selectedMethod} Number <span className="text-[#D93025]">*</span>
            </label>
            <input
              id="order-sender-number"
              type="tel"
              inputMode="tel"
              value={senderNumber}
              onChange={(e) => {
                setSenderNumber(e.target.value);
                clearFieldError('senderNumber');
              }}
              placeholder="017XXXXXXXX"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-[13.5px] text-[#1F1F1F] bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 ${
                fieldErrors.senderNumber ? 'border-[#D93025]' : 'border-slate-200 focus:border-[#1A73E8]'
              }`}
            />
            {fieldErrors.senderNumber && (
              <p className="mt-1 text-[11.5px] text-[#D93025]">{fieldErrors.senderNumber}</p>
            )}
          </div>
        </div>

        {/* Transaction ID */}
        <div>
          <label
            htmlFor="order-transaction-id"
            className="block text-[12px] font-medium text-[#3C4043] mb-1"
          >
            Transaction ID (TrxID) <span className="text-[#D93025]">*</span>
          </label>
          <input
            id="order-transaction-id"
            type="text"
            value={transactionId}
            onChange={(e) => {
              setTransactionId(e.target.value);
              clearFieldError('transactionId');
            }}
            placeholder="e.g., BKH8A92K10"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-[13.5px] font-mono uppercase text-[#1F1F1F] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 ${
              fieldErrors.transactionId ? 'border-[#D93025]' : 'border-slate-200 focus:border-[#1A73E8]'
            }`}
          />
          {fieldErrors.transactionId && (
            <p className="mt-1 text-[11.5px] text-[#D93025]">{fieldErrors.transactionId}</p>
          )}
        </div>

        {/* WhatsApp & IMO Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="order-whatsapp-number"
              className="block text-[12px] font-medium text-[#3C4043] mb-1"
            >
              WhatsApp Number <span className="text-[#D93025]">*</span>
            </label>
            <input
              id="order-whatsapp-number"
              type="tel"
              inputMode="tel"
              value={whatsappNumber}
              onChange={(e) => {
                setWhatsappNumber(e.target.value);
                clearFieldError('whatsappNumber');
              }}
              placeholder="017XXXXXXXX"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-[13.5px] text-[#1F1F1F] bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 ${
                fieldErrors.whatsappNumber ? 'border-[#D93025]' : 'border-slate-200 focus:border-[#1A73E8]'
              }`}
            />
            {fieldErrors.whatsappNumber && (
              <p className="mt-1 text-[11.5px] text-[#D93025]">{fieldErrors.whatsappNumber}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="order-imo-number"
              className="block text-[12px] font-medium text-[#3C4043] mb-1"
            >
              IMO Number <span className="text-[#5F6368] font-normal">(Optional)</span>
            </label>
            <input
              id="order-imo-number"
              type="tel"
              inputMode="tel"
              value={imoNumber}
              onChange={(e) => {
                setImoNumber(e.target.value);
                clearFieldError('imoNumber');
              }}
              placeholder="017XXXXXXXX"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-[13.5px] text-[#1F1F1F] bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 ${
                fieldErrors.imoNumber ? 'border-[#D93025]' : 'border-slate-200 focus:border-[#1A73E8]'
              }`}
            />
            {fieldErrors.imoNumber && (
              <p className="mt-1 text-[11.5px] text-[#D93025]">{fieldErrors.imoNumber}</p>
            )}
          </div>
        </div>

        {/* Payment Confirmation Checkbox */}
        <div>
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={paymentConfirmed}
              onChange={(e) => {
                setPaymentConfirmed(e.target.checked);
                clearFieldError('paymentConfirmed');
              }}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#1A73E8] focus:ring-[#1A73E8] shrink-0"
            />
            <span className="text-[12.5px] leading-snug text-[#374151]">
              I confirm that I have completed the {PRICING_CONFIG.currencySymbol}
              {PRICING_CONFIG.currentPrice} payment via {selectedMethod} and entered the valid
              Transaction ID.
            </span>
          </label>
          {fieldErrors.paymentConfirmed && (
            <p className="mt-1 text-[11.5px] text-[#D93025]">{fieldErrors.paymentConfirmed}</p>
          )}
        </div>
      </div>

      {/* Top Server / Network Error Alert */}
      {submitError && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-[12.5px] text-[#B91C1C] flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Step 7: Submit Purchase Request Button */}
      <div className="pt-1 space-y-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[46px] px-4 py-2.5 rounded-full bg-gradient-to-b from-[#1D74F5] to-[#0D5BD9] hover:from-[#1868E0] hover:to-[#0A4EC0] disabled:opacity-65 disabled:cursor-not-allowed text-white font-display font-semibold text-[14px] shadow-[0_4px_14px_rgba(26,115,232,0.3)] transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Submitting Purchase Request...</span>
            </>
          ) : (
            <span>Submit Purchase Request</span>
          )}
        </button>

        <p className="text-center text-[11.5px] text-[#5F6368] flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#188038]" aria-hidden="true" />
          <span>Orders remain pending until manually verified by an admin</span>
        </p>
      </div>
    </form>
  );
}
