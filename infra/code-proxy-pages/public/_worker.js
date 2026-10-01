const ORIGIN = "https://toumai-code-theia-preview.onrender.com";
const CODE_HOST = "code.toumaiai.com";
const PREVIEW_HOST = "preview.toumaiai.com";
const PREVIEW_COOKIE = "toumai_preview_port";

function parseCookies(value) {
  const result = {};
  for (const part of String(value || "").split(";")) {
    const index = part.indexOf("=");
    if (index <= 0) continue;
    const key = part.slice(0, index).trim();
    const val = part.slice(index + 1).trim();
    if (key) result[key] = val;
  }
  return result;
}

function normalizePort(value) {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : null;
}

function previewPort(request, publicUrl) {
  const explicit = normalizePort(publicUrl.searchParams.get("__toumai_port"));
  if (explicit) return explicit;
  const cookies = parseCookies(request.headers.get("cookie"));
  return normalizePort(cookies[PREVIEW_COOKIE]);
}

function previewCookie(port) {
  return `${PREVIEW_COOKIE}=${port}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=43200`;
}

function toOriginRequest(request, publicUrl, port) {
  const target = new URL(ORIGIN);
  const incomingSearch = new URLSearchParams(publicUrl.search);
  incomingSearch.delete("__toumai_port");

  if (publicUrl.hostname === PREVIEW_HOST) {
    target.pathname = `/__toumai_preview/${port}${publicUrl.pathname}`;
  } else {
    target.pathname = publicUrl.pathname;
  }
  const query = incomingSearch.toString();
  target.search = query ? `?${query}` : "";

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", publicUrl.host);
  headers.set("x-forwarded-proto", "https");
  headers.set("x-toumai-edge", "cloudflare-pages");
  if (port) headers.set("x-toumai-preview-port", String(port));

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
    const isPreview = publicUrl.hostname === PREVIEW_HOST;
    const isCode = publicUrl.hostname === CODE_HOST || publicUrl.hostname.endsWith(".pages.dev");

    if (!isPreview && !isCode) {
      return new Response("Unknown Toumaï Code host.", { status: 404 });
    }

    let port = null;
    if (isPreview) {
      port = previewPort(request, publicUrl);
      if (!port) {
        return new Response("Aucune prévisualisation active. Ouvrez Preview depuis Toumaï Code.", {
          status: 400,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      }

      if (publicUrl.searchParams.has("__toumai_port") && (request.method === "GET" || request.method === "HEAD")) {
        const clean = new URL(publicUrl.toString());
        clean.searchParams.delete("__toumai_port");
        return new Response(null, {
          status: 302,
          headers: {
            location: clean.toString(),
            "set-cookie": previewCookie(port),
            "cache-control": "no-store",
          },
        });
      }
    }

    try {
      const originResponse = await fetch(toOriginRequest(request, publicUrl, port));

      if (originResponse.webSocket || originResponse.status === 101) {
        return originResponse;
      }

      const headers = new Headers(originResponse.headers);
      const location = headers.get("location");
      if (location) headers.set("location", rewriteLocation(location, publicUrl.host));
      if (isPreview && port) headers.append("set-cookie", previewCookie(port));
      headers.set("x-toumai-origin", "render");
      if (isPreview) headers.set("x-toumai-preview-port", String(port));

      return new Response(originResponse.body, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers,
      });
    } catch (_) {
      return new Response(isPreview
        ? "La prévisualisation est temporairement indisponible."
        : "Toumaï Code est temporairement indisponible.", {
        status: 502,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
  },
};
