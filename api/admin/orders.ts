import {
  jsonResponse,
  readTmpOrders,
  requireAdminRequest,
} from '../_lib/adminRuntime';

export function GET(request: Request): Response {
  const auth = requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? 'all';
  const query = (url.searchParams.get('q') ?? '').trim().toLowerCase();

  const allOrders = readTmpOrders();
  const summary = {
    totalOrders: allOrders.length,
    pendingVerification: allOrders.filter((o) => o.paymentStatus === 'Pending Verification').length,
    approvedPayments: allOrders.filter((o) => o.paymentStatus === 'Approved').length,
    rejectedPayments: allOrders.filter((o) => o.paymentStatus === 'Rejected').length,
    completedOrders: allOrders.filter((o) => o.orderStatus === 'Completed').length,
  };

  let filtered = allOrders;
  if (status === 'pending_verification') {
    filtered = filtered.filter((o) => o.paymentStatus === 'Pending Verification');
  } else if (status === 'approved') {
    filtered = filtered.filter((o) => o.paymentStatus === 'Approved');
  } else if (status === 'rejected') {
    filtered = filtered.filter((o) => o.paymentStatus === 'Rejected');
  } else if (status === 'completed') {
    filtered = filtered.filter((o) => o.orderStatus === 'Completed');
  }

  if (query.length > 0) {
    filtered = filtered.filter((o) =>
      [o.orderId, o.customerName, o.whatsappNumber, o.transactionId].some((val) =>
        String(val ?? '').toLowerCase().includes(query)
      )
    );
  }

  filtered.sort((a, b) =>
    String(b.submittedAt ?? '').localeCompare(String(a.submittedAt ?? ''))
  );

  return jsonResponse({ summary, orders: filtered }, 200);
}
