const DEFAULT_ORIGIN = "https://toumai-code-theia-preview.onrender.com";

function buildOriginRequest(request, originBase) {
  const incoming = new URL(request.url);
  const origin = new URL(originBase || DEFAULT_ORIGIN);

  origin.pathname = incoming.pathname;
  origin.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", "https");
  headers.set("x-toumai-edge", "cloudflare-worker");

  return new Request(origin.toString(), {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
}

function rewriteLocation(value, publicHost, originBase) {
  if (!value) return value;
  try {
    const location = new URL(value, originBase);
    const origin = new URL(originBase);
    if (location.host !== origin.host) return value;
    location.protocol = "https:";
    location.host = publicHost;
    return location.toString();
  } catch (_) {
    return value;
  }
}

export default {
  async fetch(request, env) {
    const originBase = env.TOUMAI_CODE_ORIGIN || DEFAULT_ORIGIN;
    const publicUrl = new URL(request.url);

    try {
      const originResponse = await fetch(buildOriginRequest(request, originBase));

      // A successful WebSocket upgrade carries response.webSocket. Returning the
      // original response preserves the socket as a transparent proxy to Theia.
      if (originResponse.webSocket || originResponse.status === 101) {
        return originResponse;
      }

      const headers = new Headers(originResponse.headers);
      const location = headers.get("location");
      if (location) {
        headers.set("location", rewriteLocation(location, publicUrl.host, originBase));
      }

      headers.set("x-toumai-origin", "render");

      return new Response(originResponse.body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers,
      });
    } catch (error) {
      return new Response("Toumaï Code est temporairement indisponible.", {
        status: 502,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
  },
};
