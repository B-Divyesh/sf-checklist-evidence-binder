export const PRODUCT_SLUG = 'checklist-evidence-binder';
export const CHECKOUT_URL = `https://api.sociobot.in/api/v1/products/${PRODUCT_SLUG}/checkout`;
const TOKEN_KEY = `sb_license:${PRODUCT_SLUG}`;
const CACHE_KEY = `${TOKEN_KEY}:verdict`;

interface Verdict { valid: boolean; checkedAt: number; reason?: string }

export function captureLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CACHE_KEY, JSON.stringify({ valid: true, checkedAt: 0 }));
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function storeLicense(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.setItem(CACHE_KEY, JSON.stringify({ valid: true, checkedAt: 0 }));
}

export function cachedUnlock(): boolean {
  if (!localStorage.getItem(TOKEN_KEY)) return false;
  try { return (JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Verdict).valid !== false; } catch { return true; }
}

export async function verifyLicense(force = false): Promise<Verdict | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  let cached: Verdict | null = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { /* retry */ }
  if (!force && cached && Date.now() - cached.checkedAt < 86_400_000) return cached;
  const response = await fetch(`https://api.sociobot.in/api/v1/products/${PRODUCT_SLUG}/verify?license=${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error('License verification is unavailable. Your cached access is unchanged.');
  const data = await response.json() as { valid: boolean; reason?: string };
  const verdict = { valid: data.valid, reason: data.reason, checkedAt: Date.now() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(verdict));
  return verdict;
}
