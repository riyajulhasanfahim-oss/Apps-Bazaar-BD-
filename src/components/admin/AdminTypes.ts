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

export interface AdminOrder {
  id: number;
  orderId: string;
  userId?: string;
  invoiceRef?: string | null;
  customerName: string;
  productName: string;
  amount: number;
  previousPrice: number;
  currency: string;
  paymentMethod: string;
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

export function formatOrderDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getPaymentStatusBadgeClass(status: PaymentStatus): string {
  switch (status) {
    case 'Approved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Pending Verification':
    default:
      return 'bg-amber-50 text-amber-800 border-amber-200';
  }
}

export function getOrderStatusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case 'Approved':
      return 'bg-blue-50 text-[#1A73E8] border-blue-200';
    case 'Processing':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Rejected':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Pending':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
