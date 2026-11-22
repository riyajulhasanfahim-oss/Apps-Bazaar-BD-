export function GET(): Response {
  return new Response(JSON.stringify({ shorts: [], demoVideo: null }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}
