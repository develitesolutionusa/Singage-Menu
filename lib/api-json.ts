/** Shared helpers for reading API JSON responses safely. */

export async function readApiJson<T = unknown>(
  res: Response,
): Promise<T & { error?: string }> {
  const text = await res.text();
  if (!text) {
    throw new Error(res.ok ? "Empty response" : `Request failed (${res.status})`);
  }

  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    if (
      res.status === 413 ||
      /^Request Entity/i.test(text) ||
      /too large/i.test(text)
    ) {
      throw new Error(
        "File is too large. Max 100 MB for videos and 20 MB for images.",
      );
    }
    throw new Error(
      text.slice(0, 160).trim() || `Request failed (${res.status})`,
    );
  }
}
