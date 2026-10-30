import {
  fetchCatalogText,
  LEVEL_CATALOG_URL,
} from "../../src/services/levels/transport";
import { MAX_CATALOG_LENGTH } from "../../src/services/levels/catalog";

function response(
  changes: Partial<Response> = {},
  contentType = "application/json"
) {
  return {
    ok: true,
    headers: {
      get: (name: string) => (name === "content-type" ? contentType : null),
    },
    text: jest.fn().mockResolvedValue('{"levels":[]}'),
    ...changes,
  } as unknown as Response;
}

describe("catalog transport", () => {
  afterEach(() => jest.useRealTimers());
  it("fetches only the configured public HTTPS endpoint", async () => {
    const fetcher = jest.fn().mockResolvedValue(response());
    await expect(fetchCatalogText(fetcher)).resolves.toBe('{"levels":[]}');
    expect(fetcher).toHaveBeenCalledWith(
      LEVEL_CATALOG_URL,
      expect.objectContaining({
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        signal: expect.anything(),
      })
    );
  });
  it("rejects HTTP failures and HTML error pages", async () => {
    await expect(
      fetchCatalogText(jest.fn().mockResolvedValue(response({ ok: false })))
    ).rejects.toThrow("unavailable");
    await expect(
      fetchCatalogText(jest.fn().mockResolvedValue(response({}, "text/html")))
    ).rejects.toThrow("unavailable");
  });
  it("rejects an oversized body and oversized declared length", async () => {
    await expect(
      fetchCatalogText(
        jest
          .fn()
          .mockResolvedValue(
            response({ text: async () => "x".repeat(MAX_CATALOG_LENGTH + 1) })
          )
      )
    ).rejects.toThrow("too large");
    const large = response();
    const get = (name: string) =>
      name === "content-type"
        ? "application/json"
        : String(MAX_CATALOG_LENGTH + 1);
    await expect(
      fetchCatalogText(
        jest.fn().mockResolvedValue({ ...large, headers: { get } })
      )
    ).rejects.toThrow("too large");
  });
  it("bounds a hung request even if the transport ignores abort", async () => {
    jest.useFakeTimers();
    const fetcher = jest.fn().mockImplementation(() => new Promise(() => {}));
    const promise = fetchCatalogText(fetcher, 50);
    jest.advanceTimersByTime(50);
    await expect(promise).rejects.toThrow("timed out");
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
});
