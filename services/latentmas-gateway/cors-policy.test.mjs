import { describe, expect, it } from "vitest";
import { getLatentmasCorsHeaders, resolveLoopbackHost } from "./cors-policy.mjs";

describe("LatentMAS gateway loopback policy", () => {
  it("falls back to localhost when a non-loopback host is requested", () => {
    expect(resolveLoopbackHost("0.0.0.0")).toEqual({
      requestedHost: "0.0.0.0",
      host: "localhost",
      hostOverrideBlocked: true
    });
    expect(resolveLoopbackHost("example.com")).toEqual({
      requestedHost: "example.com",
      host: "localhost",
      hostOverrideBlocked: true
    });
  });

  it("allows only explicit loopback hosts", () => {
    expect(resolveLoopbackHost("localhost")).toMatchObject({
      host: "localhost",
      hostOverrideBlocked: false
    });
    expect(resolveLoopbackHost("127.0.0.1")).toMatchObject({
      host: "127.0.0.1",
      hostOverrideBlocked: false
    });
    expect(resolveLoopbackHost("::1")).toMatchObject({
      host: "::1",
      hostOverrideBlocked: false
    });
  });

  it("never emits wildcard CORS and rejects non-loopback origins", () => {
    expect(getLatentmasCorsHeaders("http://localhost:8710")["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:8710"
    );
    expect(getLatentmasCorsHeaders("http://127.0.0.1:8710")["Access-Control-Allow-Origin"]).toBe(
      "http://127.0.0.1:8710"
    );
    expect(getLatentmasCorsHeaders("https://evil.example")["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:8710"
    );
    expect(getLatentmasCorsHeaders("*")["Access-Control-Allow-Origin"]).not.toBe("*");
  });
});
