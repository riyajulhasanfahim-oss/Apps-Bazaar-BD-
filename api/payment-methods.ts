import { DEFAULT_PAYMENT_METHODS } from '../shared/paymentMethods';

export function GET(): Response {
  return new Response(JSON.stringify({ methods: DEFAULT_PAYMENT_METHODS }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
