import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShoppingBag,
  X,
  XCircle,
} from 'lucide-react';
import {
  formatOrderDateTime,
  getOrderStatusBadgeClass,
  getPaymentStatusBadgeClass,
  type AdminOrder,
  type AdminOrderFilter,
  type OrderSummaryStats,
} from './AdminTypes';
import { OrderDetailModal } from './OrderDetailModal';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  onBackToStore: () => void;
}

const FILTER_OPTIONS: Array<{ id: AdminOrderFilter; label: string }> = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending_verification', label: 'Pending Verification' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'completed', label: 'Completed' },
];

export function AdminDashboard({
  token,
  onLogout,
  onBackToStore,
}: AdminDashboardProps) {
  const [summary, setSummary] = useState<OrderSummaryStats>({
    totalOrders: 0,
    pendingVerification: 0,
    approvedPayments: 0,
    rejectedPayments: 0,
    completedOrders: 0,
  });
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState<AdminOrderFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchOrders = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('status', filter);
      if (debouncedSearch) {
        params.set('q', debouncedSearch);
      }

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        signal,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        onLogout();
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error ?? 'Failed to load orders.');
        return;
      }

      if (data.summary) setSummary(data.summary as OrderSummaryStats);
      if (Array.isArray(data.orders)) setOrders(data.orders as AdminOrder[]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Network error while loading orders.');
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [filter, debouncedSearch, token, onLogout]);

  useEffect(() => {
    const controller = new AbortController();
    fetchOrders(controller.signal);
    return () => controller.abort();
  }, [fetchOrders]);

  const handleOrderUpdated = (
    updatedOrder: AdminOrder,
    updatedSummary?: OrderSummaryStats
  ) => {
    setSelectedOrder(updatedOrder);
    if (updatedSummary) {
      setSummary(updatedSummary);
    }
    fetchOrders();
  };

  const summaryCards: Array<{
    label: string;
    value: number;
    targetFilter: AdminOrderFilter;
    icon: typeof ShoppingBag;
    accent: string;
  }> = [
    {
      label: 'Total Orders',
      value: summary.totalOrders,
      targetFilter: 'all',
      icon: ShoppingBag,
      accent: 'text-[#1A73E8] bg-blue-50',
    },
    {
      label: 'Pending Verification',
      value: summary.pendingVerification,
      targetFilter: 'pending_verification',
      icon: Clock,
      accent: 'text-amber-700 bg-amber-50',
    },
    {
      label: 'Approved Payments',
      value: summary.approvedPayments,
      targetFilter: 'approved',
      icon: CheckCircle2,
      accent: 'text-[#1A73E8] bg-blue-50',
    },
    {
      label: 'Rejected Payments',
      value: summary.rejectedPayments,
      targetFilter: 'rejected',
      icon: XCircle,
      accent: 'text-red-700 bg-red-50',
    },
    {
      label: 'Completed Orders',
      value: summary.completedOrders,
      targetFilter: 'completed',
      icon: CheckCircle2,
      accent: 'text-emerald-700 bg-emerald-50',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F8FD] text-[#1F1F1F]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/85">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-[17px] sm:text-[18px] font-bold text-[#1F1F1F] whitespace-nowrap">
              Apps Bazaar Admin
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onBackToStore}
              className="px-3 min-h-[38px] rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[12.5px] font-semibold text-[#3C4043] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Storefront</span>
            </button>

            <button
              type="button"
              onClick={() => fetchOrders()}
              aria-label="Refresh orders"
              className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[#3C4043] inline-flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 min-h-[38px] rounded-full bg-[#1A73E8] hover:bg-[#0D5BD9] text-white font-display font-semibold text-[12.5px] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
        {/* Summary Cards */}
        <section aria-label="Order summary metrics" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            const isActive = filter === card.targetFilter;
            return (
              <button
                key={card.label}
                type="button"
                onClick={() => setFilter(card.targetFilter)}
                className={`rounded-2xl bg-white p-4 border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#1A73E8] ring-1 ring-[#1A73E8] shadow-sm'
                    : 'border-slate-200/85 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-medium text-[#5F6368] leading-snug">
                    {card.label}
                  </span>
                  <span
                    className={`w-7 h-7 rounded-xl inline-flex items-center justify-center shrink-0 ${card.accent}`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-display text-[24px] font-extrabold text-[#1F1F1F] tabular-nums">
                  {card.value}
                </div>
              </button>
            );
          })}
        </section>

        {/* Filters & Search Toolbar */}
        <section className="bg-white rounded-2xl border border-slate-200/85 p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFilter(opt.id)}
                  className={`px-3.5 py-2 rounded-full text-[12.5px] font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    filter === opt.id
                      ? 'bg-[#1A73E8] text-white'
                      : 'bg-slate-100 text-[#3C4043] hover:bg-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full lg:w-[320px] shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search Order ID, name, WhatsApp, TrxID"
                className="w-full pl-9 pr-9 py-2 rounded-full border border-slate-200 text-[13px] text-[#1F1F1F] bg-slate-50/70 focus:bg-white focus:outline-none focus:border-[#1A73E8]"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Error State */}
        {error && (
          <div
            role="alert"
            className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-3 text-[13px] text-red-700"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchOrders()}
              className="px-3 py-1.5 rounded-full bg-white border border-red-200 font-semibold text-red-700 hover:bg-red-100 cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-2xl border border-slate-200/85 py-14 flex flex-col items-center justify-center gap-2 text-[#5F6368]">
            <Loader2 className="w-6 h-6 animate-spin text-[#1A73E8]" />
            <span className="text-[13px]">Loading purchase requests...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && orders.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/85 py-14 px-4 flex flex-col items-center justify-center text-center">
            <Inbox className="w-9 h-9 text-slate-300 mb-2" />
            <div className="font-display text-[15px] font-bold text-[#1F1F1F]">
              No matching orders found
            </div>
            <p className="mt-1 text-[13px] text-[#5F6368] max-w-sm">
              {debouncedSearch || filter !== 'all'
                ? 'Try clearing your search query or switching to All Orders.'
                : 'Purchase requests submitted from the storefront will appear here.'}
            </p>
          </div>
        )}

        {/* Orders List: Desktop Table + Mobile Cards */}
        {!isLoading && !error && orders.length > 0 && (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/85 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11.5px] font-semibold text-[#5F6368]">
                      <th className="py-3 px-4">Order ID &amp; Date</th>
                      <th className="py-3 px-4">Customer &amp; Contact</th>
                      <th className="py-3 px-4">App &amp; Amount</th>
                      <th className="py-3 px-4">Payment &amp; TrxID</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4">Order Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[13px]">
                    {orders.map((order) => (
                      <tr
                        key={order.orderId}
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-blue-50/45 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-mono font-bold text-[#1A73E8]">
                            {order.orderId}
                          </div>
                          <div className="text-[11.5px] text-[#5F6368] mt-0.5 tabular-nums">
                            {formatOrderDateTime(order.submittedAt)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-semibold text-[#1F1F1F]">{order.customerName}</div>
                          <div className="text-[11.5px] text-[#5F6368] tabular-nums mt-0.5">
                            WA: {order.whatsappNumber}
                            {order.imoNumber ? ` · IMO: ${order.imoNumber}` : ''}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-medium text-[#1F1F1F]">{order.productName}</div>
                          <div className="font-display font-bold text-[#1F1F1F] tabular-nums mt-0.5">
                            ৳{order.amount}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-semibold text-[#1F1F1F]">
                            {order.paymentMethod}{' '}
                            <span className="font-normal text-[#5F6368] tabular-nums">
                              ({order.senderNumber})
                            </span>
                          </div>
                          <div className="font-mono text-[12px] text-[#3C4043] mt-0.5">
                            {order.transactionId}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold border whitespace-nowrap ${getPaymentStatusBadgeClass(
                              order.paymentStatus
                            )}`}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold border whitespace-nowrap ${getOrderStatusBadgeClass(
                              order.orderStatus
                            )}`}
                          >
                            {order.orderStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Order Cards */}
            <div className="md:hidden space-y-3">
              {orders.map((order) => (
                <button
                  key={order.orderId}
                  type="button"
                  onClick={() => setSelectedOrder(order)}
                  className="w-full text-left bg-white rounded-2xl border border-slate-200/85 p-4 space-y-2.5 shadow-2xs active:scale-[0.99] transition-transform cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-[13px] font-bold text-[#1A73E8]">
                        {order.orderId}
                      </div>
                      <div className="font-display font-bold text-[15px] text-[#1F1F1F] mt-0.5">
                        {order.customerName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-extrabold text-[15px] text-[#1F1F1F] tabular-nums">
                        ৳{order.amount}
                      </div>
                      <div className="text-[11px] text-[#5F6368]">{order.productName}</div>
                    </div>
                  </div>

                  <div className="text-[12px] text-[#4B5563] space-y-0.5">
                    <div>
                      <span className="font-semibold text-[#1F1F1F]">{order.paymentMethod}</span> ·
                      Sender <span className="tabular-nums">{order.senderNumber}</span> · TrxID{' '}
                      <span className="font-mono font-semibold text-[#1F1F1F]">
                        {order.transactionId}
                      </span>
                    </div>
                    <div className="tabular-nums">
                      WhatsApp: {order.whatsappNumber}
                      {order.imoNumber ? ` · IMO: ${order.imoNumber}` : ''}
                    </div>
                    <div className="text-[11px] text-[#5F6368]">
                      {formatOrderDateTime(order.submittedAt)}
                    </div>
                  </div>

                  <div className="pt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getPaymentStatusBadgeClass(
                        order.paymentStatus
                      )}`}
                    >
                      {order.paymentStatus}
                    </span>
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getOrderStatusBadgeClass(
                        order.orderStatus
                      )}`}
                    >
                      {order.orderStatus}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </main>

      <OrderDetailModal
        order={selectedOrder}
        token={token}
        onClose={() => setSelectedOrder(null)}
        onOrderUpdated={handleOrderUpdated}
        onUnauthorized={onLogout}
      />
    </div>
  );
}
