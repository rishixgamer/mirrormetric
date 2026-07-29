interface StaticAssets {
  fetch(request: Request): Promise<Response>;
}

interface Environment {
  readonly ASSETS: StaticAssets;
}

const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy":
    "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function withHeaders(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  if (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/wasm/") ||
    pathname.startsWith("/models/")
  ) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function sitemap(origin: string): Response {
  const routes = [
    "",
    "/analyze",
    "/methodology",
    "/privacy",
    "/terms",
    "/open-source",
  ];
  const urls = routes
    .map(
      (route) =>
        `<url><loc>${origin}${route || "/"}</loc><changefreq>monthly</changefreq></url>`,
    )
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/sitemap.xml") {
      return withHeaders(sitemap(url.origin), url.pathname);
    }
    if (url.pathname === "/robots.txt") {
      return withHeaders(
        new Response(
          `User-agent: *\nAllow: /\nDisallow: /results\nDisallow: /history\nSitemap: ${url.origin}/sitemap.xml\n`,
          { headers: { "Content-Type": "text/plain; charset=utf-8" } },
        ),
        url.pathname,
      );
    }

    let response = await env.ASSETS.fetch(request);
    if (
      response.status === 404 &&
      request.method === "GET" &&
      request.headers.get("Accept")?.includes("text/html")
    ) {
      response = await env.ASSETS.fetch(new Request(new URL("/", url), request));
    }
    if (response.headers.get("Content-Type")?.includes("text/html")) {
      const headers = new Headers(response.headers);
      const body = (await response.text()).replaceAll(
        "https://mirrormetric.invalid",
        url.origin,
      );
      response = new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
    return withHeaders(response, url.pathname);
  },
};
