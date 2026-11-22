import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  PackageCheck,
  Save,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import {
  formatOrderDateTime,
  getOrderStatusBadgeClass,
  getPaymentStatusBadgeClass,
  type AdminOrder,
  type AdminOrderAction,
  type OrderSummaryStats,
} from './AdminTypes';

interface OrderDetailModalProps {
  order: AdminOrder | null;
  token: string;
  onClose: () => void;
  onOrderUpdated: (updatedOrder: AdminOrder, summary?: OrderSummaryStats) => void;
  onUnauthorized: () => void;
}

export function OrderDetailModal({
  order,
  token,
  onClose,
  onOrderUpdated,
  onUnauthorized,
}: OrderDetailModalProps) {
  const [adminNote, setAdminNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  const [pendingConfirmAction, setPendingConfirmAction] = useState<
    'approve_payment' | 'reject_payment' | null
  >(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setAdminNote(order.adminNotes ?? '');
      setPendingConfirmAction(null);
      setRejectionReason('');
      setActionError(null);
      setNoteSavedFeedback(false);
    }
  }, [order]);

  useEffect(() => {
    if (!order) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [order, onClose]);

  if (!order) return null;

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      setCopiedField(null);
    }
  };

  const handleSaveNote = async () => {
    if (isSavingNote) return;
    setIsSavingNote(true);
    setActionError(null);
    setNoteSavedFeedback(false);

    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.orderId)}/note`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adminNotes: adminNote }),
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.order) {
        setActionError(data?.error ?? 'Failed to save internal note.');
        return;
      }

      setNoteSavedFeedback(true);
      onOrderUpdated(data.order as AdminOrder);
      window.setTimeout(() => setNoteSavedFeedback(false), 2000);
    } catch {
      setActionError('Network error while saving note.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const executeStatusTransition = async (action: AdminOrderAction, reason?: string) => {
    if (isUpdatingStatus) return;
    setActionError(null);

    if (action === 'reject_payment') {
      const clean = (reason ?? '').trim();
      if (clean.length < 3) {
        setActionError('Please enter a clear rejection reason (at least 3 characters).');
        return;
      }
    }

    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order.orderId)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'reject_payment' ? reason : undefined,
        }),
      });

      if (res.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.order) {
        setActionError(data?.error ?? 'Unable to update order status.');
        return;
      }

      setPendingConfirmAction(null);
      setRejectionReason('');
      onOrderUpdated(data.order as AdminOrder, data.summary as OrderSummaryStats | undefined);
    } catch {
      setActionError('Network error while updating order status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Safe WhatsApp link strictly using normalized digits
  const safeWhatsAppDigits = /^01[3-9]\d{8}$/.test(order.whatsappNumber)
    ? `88${order.whatsappNumber}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-[2px] p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[540px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/85 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
          <div>
            <div className="font-mono text-[13.5px] font-bold text-[#1A73E8]">
              {order.orderId}
            </div>
            <div className="text-[11.5px] text-[#5F6368]">
              Submitted {formatOrderDateTime(order.submittedAt)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order details"
            className="w-9 h-9 -mr-1.5 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Status Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
            <div>
              <div className="text-[11px] font-medium text-[#5F6368]">Payment Status</div>
              <span
                className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold border ${getPaymentStatusBadgeClass(
                  order.paymentStatus
                )}`}
              >
                {order.paymentStatus}
              </span>
            </div>
            <div>
              <div className="text-[11px] font-medium text-[#5F6368]">Order Status</div>
              <span
                className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold border ${getOrderStatusBadgeClass(
                  order.orderStatus
                )}`}
              >
                {order.orderStatus}
              </span>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-medium text-[#5F6368]">Amount</div>
              <div className="font-display text-[17px] font-extrabold text-[#1F1F1F] tabular-nums">
                ৳{order.amount} <span className="text-[11px] font-medium">{order.currency}</span>
              </div>
            </div>
          </div>

          {/* Rejection Reason Alert if Rejected */}
          {order.paymentStatus === 'Rejected' && order.rejectionReason && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-[12.5px] text-red-800">
              <span className="font-semibold">Rejection Reason:</span> {order.rejectionReason}
            </div>
          )}

          {/* Customer & Payment Details */}
          <div className="rounded-2xl border border-slate-200/80 divide-y divide-slate-100 text-[13px]">
            <div className="px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#5F6368]">Customer Name</span>
              <span className="font-semibold text-[#1F1F1F]">{order.customerName}</span>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#5F6368]">App / Product</span>
              <span className="font-medium text-[#1F1F1F]">{order.productName}</span>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#5F6368]">Payment Method</span>
              <span className="font-semibold text-[#1F1F1F]">{order.paymentMethod}</span>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#5F6368]">Sender Number</span>
              <button
                type="button"
                onClick={() => handleCopy('sender', order.senderNumber)}
                className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#1F1F1F] hover:text-[#1A73E8] cursor-pointer"
              >
                <span>{order.senderNumber}</span>
                {copiedField === 'sender' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#5F6368]">Transaction ID</span>
              <button
                type="button"
                onClick={() => handleCopy('trx', order.transactionId)}
                className="inline-flex items-center gap-1.5 font-mono font-bold text-[#1A73E8] cursor-pointer"
              >
                <span>{order.transactionId}</span>
                {copiedField === 'trx' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>
            <div className="px-4 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#5F6368]">WhatsApp</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('wa', order.whatsappNumber)}
                  className="inline-flex items-center gap-1 font-mono font-semibold text-[#1F1F1F] hover:text-[#1A73E8] cursor-pointer"
                >
                  <span>{order.whatsappNumber}</span>
                  {copiedField === 'wa' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                {safeWhatsAppDigits && (
                  <a
                    href={`https://wa.me/${safeWhatsAppDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold hover:bg-emerald-100"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>Chat</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
            {order.imoNumber && (
              <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                <span className="text-[#5F6368]">IMO Number</span>
                <button
                  type="button"
                  onClick={() => handleCopy('imo', order.imoNumber ?? '')}
                  className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#1F1F1F] hover:text-[#1A73E8] cursor-pointer"
                >
                  <span>{order.imoNumber}</span>
                  {copiedField === 'imo' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {actionError && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-[12.5px] text-red-700 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Confirmation Dialog for Approve / Reject Payment */}
          {pendingConfirmAction && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-[#1A73E8] shrink-0 mt-0.5" />
                <div className="text-[13px] font-semibold text-[#1F1F1F]">
                  {pendingConfirmAction === 'approve_payment'
                    ? `Confirm payment verification for ${order.orderId}?`
                    : `Reject payment for ${order.orderId}?`}
                </div>
              </div>

              {pendingConfirmAction === 'approve_payment' ? (
                <p className="text-[12px] text-[#4B5563]">
                  Make sure you have verified <strong>৳{order.amount}</strong> from{' '}
                  <strong>{order.senderNumber}</strong> with TrxID{' '}
                  <strong className="font-mono">{order.transactionId}</strong> in your{' '}
                  {order.paymentMethod} account.
                </p>
              ) : (
                <div>
                  <label
                    htmlFor="rejection-reason-input"
                    className="block text-[12px] font-medium text-[#3C4043] mb-1"
                  >
                    Rejection Reason <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="rejection-reason-input"
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g., Transaction ID not found or incorrect amount"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-[13px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8]"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() =>
                    executeStatusTransition(
                      pendingConfirmAction,
                      pendingConfirmAction === 'reject_payment' ? rejectionReason : undefined
                    )
                  }
                  className={`flex-1 min-h-[40px] rounded-full font-display font-semibold text-[13px] text-white inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                    pendingConfirmAction === 'approve_payment'
                      ? 'bg-[#188038] hover:bg-[#146C2E]'
                      : 'bg-[#D93025] hover:bg-[#B91C1C]'
                  }`}
                >
                  {isUpdatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {pendingConfirmAction === 'approve_payment'
                      ? 'Confirm Approve'
                      : 'Confirm Reject'}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => {
                    setPendingConfirmAction(null);
                    setActionError(null);
                  }}
                  className="px-4 min-h-[40px] rounded-full bg-white border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Status Flow Actions */}
          {!pendingConfirmAction && (
            <div className="space-y-2">
              {order.paymentStatus === 'Pending Verification' &&
                order.orderStatus === 'Pending' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setPendingConfirmAction('approve_payment');
                      }}
                      className="min-h-[42px] px-3 rounded-full bg-[#1A73E8] hover:bg-[#0D5BD9] text-white font-display font-semibold text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify &amp; Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setPendingConfirmAction('reject_payment');
                      }}
                      className="min-h-[42px] px-3 rounded-full bg-white border border-red-300 text-[#D93025] hover:bg-red-50 font-display font-semibold text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Payment</span>
                    </button>
                  </div>
                )}

              {order.paymentStatus === 'Approved' && order.orderStatus === 'Approved' && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => executeStatusTransition('mark_processing')}
                  className="w-full min-h-[42px] rounded-full bg-[#1A73E8] hover:bg-[#0D5BD9] text-white font-display font-semibold text-[13.5px] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PackageCheck className="w-4 h-4" />
                  )}
                  <span>Mark Order as Processing</span>
                </button>
              )}

              {order.paymentStatus === 'Approved' && order.orderStatus === 'Processing' && (
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => executeStatusTransition('mark_completed')}
                  className="w-full min-h-[42px] rounded-full bg-[#188038] hover:bg-[#146C2E] text-white font-display font-semibold text-[13.5px] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isUpdatingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Mark Order as Completed</span>
                </button>
              )}
            </div>
          )}

          {/* Internal Admin Note */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="admin-internal-note"
                className="font-display text-[13px] font-semibold text-[#1F1F1F]"
              >
                Internal Admin Note
              </label>
              {noteSavedFeedback && (
                <span className="text-[11.5px] font-semibold text-[#188038]">Saved</span>
              )}
            </div>
            <textarea
              id="admin-internal-note"
              rows={2}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Add private verification notes or delivery tracking..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] text-[#1F1F1F] focus:outline-none focus:border-[#1A73E8]"
            />
            <button
              type="button"
              disabled={isSavingNote}
              onClick={handleSaveNote}
              className="px-4 min-h-[36px] rounded-full bg-slate-100 hover:bg-slate-200 text-[#1F1F1F] font-display font-semibold text-[12.5px] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isSavingNote ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
