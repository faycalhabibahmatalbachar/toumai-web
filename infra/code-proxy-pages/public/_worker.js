const ORIGIN = "https://toumai-code-theia-preview.onrender.com";

function toOriginRequest(request) {
  const incoming = new URL(request.url);
  const target = new URL(ORIGIN);
  target.pathname = incoming.pathname;
  target.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", "https");
  headers.set("x-toumai-edge", "cloudflare-pages");

  return new Request(target.toString(), {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
}

function rewriteLocation(value, publicHost) {
  if (!value) return value;
  try {
    const location = new URL(value, ORIGIN);
    const origin = new URL(ORIGIN);
    if (location.host !== origin.host) return value;
    location.protocol = "https:";
    location.host = publicHost;
    return location.toString();
  } catch (_) {
    return value;
  }
}

export default {
  async fetch(request) {
    const publicUrl = new URL(request.url);

    try {
      const originResponse = await fetch(toOriginRequest(request));

      // Preserve Cloudflare's transparent WebSocket proxy response for Theia.
      if (originResponse.webSocket || originResponse.status === 101) {
        return originResponse;
      }

      const headers = new Headers(originResponse.headers);
      const location = headers.get("location");
      if (location) {
        headers.set("location", rewriteLocation(location, publicUrl.host));
      }
      headers.set("x-toumai-origin", "render");

      return new Response(originResponse.body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers,
      });
    } catch (_) {
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
