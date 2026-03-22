export function toMediaUrl(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }

  if (raw.startsWith("/")) return raw;

  return `/${raw.replace(/^\.?\/+/, "")}`;
}
