const PRIMARY_HOST = "www.sirinx.co";
const APEX_HOST = "sirinx.co";
const PAGES_HOST = "sirinx-co.pages.dev";

function redirectToPrimary(requestUrl) {
  const url = new URL(requestUrl);
  url.protocol = "https:";
  url.hostname = PRIMARY_HOST;
  return Response.redirect(url.toString(), 301);
}

async function proxyToPages(request) {
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(request.url);
  upstreamUrl.protocol = "https:";
  upstreamUrl.hostname = PAGES_HOST;

  const upstreamRequest = new Request(upstreamUrl.toString(), request);
  upstreamRequest.headers.set("x-forwarded-host", incomingUrl.hostname);
  upstreamRequest.headers.set("x-forwarded-proto", "https");

  const response = await fetch(upstreamRequest);
  const headers = new Headers(response.headers);
  headers.set("x-sirinx-router", "main-www");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.hostname === APEX_HOST) {
      return redirectToPrimary(request.url);
    }

    if (url.hostname === PRIMARY_HOST) {
      return proxyToPages(request);
    }

    return new Response("Not found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
};
