import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApiUrl, getApiBaseUrl, getHealth } from "./api";

describe("api connection configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("normalizes a configured API base URL", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://veil-api.example.com/");

    expect(getApiBaseUrl()).toBe("https://veil-api.example.com");
    expect(buildApiUrl("/api/health")).toBe("https://veil-api.example.com/api/health");
  });

  it("uses relative API paths when no production base URL is configured", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_API_BASE_URL", "");

    expect(getApiBaseUrl()).toBe("");
    expect(buildApiUrl("/api/health")).toBe("/api/health");
  });

  it("sends requests through the shared URL builder", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://veil-api.example.com/");
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: "ok" }),
      } as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getHealth()).resolves.toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://veil-api.example.com/api/health",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
