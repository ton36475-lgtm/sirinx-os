// Ghost Claw OS - Edge Gateway for Autoloop Streaming
// Path: /Users/sirinx/sirinx-os/services/edge-gateway/src/index.ts

export interface Env {
  ORCHESTRATOR_GO_URL: string;
  MAXPLUS_GATEWAY_URL: string;
  SIRINX_SECRET_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. WAF Ingress Layer - Prevent large payload attacks
    const contentLength = request.headers.get("content-length");
    if (request.method === "POST" && contentLength && parseInt(contentLength) > 10485760) {
      return new Response("Security Halted: Master pack block entity overflow", { status: 413 });
    }

    // 2. WebSocket Streaming for Real-time Autoloop Status
    if (url.pathname === "/stream" && request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
      
      server.accept();
      
      // Connect to backend autoloop stream
      const backendWsUrl = env.ORCHESTRATOR_GO_URL.replace("http://", "ws://").replace("https://", "ws://") + "/ws/v1/autoloop";
      
      try {
        const backendSocket = new WebSocket(backendWsUrl);
        
        // Forward messages bidirectionally
        server.addEventListener("message", (event) => {
          if (backendSocket.readyState === WebSocket.OPEN) {
            backendSocket.send(event.data);
          }
        });
        
        backendSocket.addEventListener("message", (event) => {
          if (server.readyState === WebSocket.OPEN) {
            server.send(event.data);
          }
        });
        
        server.addEventListener("close", () => backendSocket.close(1000));
        backendSocket.addEventListener("close", () => server.close(1000));
        
      } catch (e) {
        server.send(JSON.stringify({
          status: "error",
          message: "Backend connection failed",
          error: String(e)
        }));
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    // 3. HTTP Proxy to Backend Orchestrator
    const cleanHeaders = new Headers(request.headers);
    cleanHeaders.set("X-Node-Origin", "CF_EDGE_BANGKOK");
    cleanHeaders.set("X-Autoloop-Source", "hermes-websocket");
    cleanHeaders.delete("cookie"); // Remove identifying cookies

    // Clean up sensitive headers
    const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
    for (const header of sensitiveHeaders) {
      cleanHeaders.delete(header);
    }

    try {
      const targetUrl = `${env.ORCHESTRATOR_GO_URL}${url.pathname}${url.search}`;
      const backendResponse = await fetch(targetUrl, {
        method: request.method,
        headers: cleanHeaders,
        body: request.body,
        redirect: "manual"
      });
      
      return backendResponse;
    } catch (error) {
      return new Response(JSON.stringify({
        status: "failed",
        exception_message: `Gateway error: ${error}`
      }), { status: 502, headers: { "Content-Type": "application/json" } });
    }
  },
};