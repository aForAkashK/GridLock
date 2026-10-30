/** Public, data-only endpoint. No auth, user identifiers or native dependency. */
import { MAX_CATALOG_LENGTH } from "./catalog";
import { CONTENT_URL } from "./channel";

export const LEVEL_CATALOG_URL = CONTENT_URL;
export const DOWNLOAD_TIMEOUT_MS = 8000;

export async function fetchCatalogText(
  fetcher: typeof fetch = fetch,
  timeoutMs = DOWNLOAD_TIMEOUT_MS
): Promise<string> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetcher(LEVEL_CATALOG_URL, {
          signal: controller.signal,
          // Revalidate a cached error after a new channel is deployed. Runtime
          // throttling already limits requests; a stale 404 must not stall delivery.
          headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        });
        if (
          !response.ok ||
          !response.headers
            .get("content-type")
            ?.toLowerCase()
            .startsWith("application/json")
        ) {
          throw new Error("Level catalog unavailable");
        }
        const length = Number(response.headers.get("content-length"));
        if (length > MAX_CATALOG_LENGTH) {
          throw new Error("Level catalog is too large");
        }
        const text = await response.text();
        if (text.length > MAX_CATALOG_LENGTH) {
          throw new Error("Level catalog is too large");
        }
        return text;
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("Level catalog download timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
