const disabledMessage = 'AI chưa được kích hoạt trong Bản Quà Tặng.';

export default {
  async fetch(request, env) {
    if (/^\/api(?:\/|$)/.test(new URL(request.url).pathname)) {
      return new Response(JSON.stringify({ error: disabledMessage }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
