/**
 * Outbound / copy primary for desktop → foodma web.
 * Both roots are valid in production; flip VITE_WEB_ROOT_DOMAIN when renewing.
 */

export const PRIMARY_ROOT_DOMAIN = "foodma.co";
export const SECONDARY_ROOT_DOMAIN = "foodma.com.ng";
export const SECONDARY_PUBLIC_HOST = "www.foodma.com.ng";

export const PRODUCTION_ROOT_DOMAINS = [
  PRIMARY_ROOT_DOMAIN,
  SECONDARY_ROOT_DOMAIN,
] as const;

function stripWww(host: string): string {
  return host.replace(/^www\./i, "");
}

function toRootDomain(hostOrRoot: string): string {
  return stripWww(
    hostOrRoot
      .replace(/^https?:\/\//i, "")
      .replace(/\/$/, "")
      .split(":")[0]
      .trim()
      .toLowerCase(),
  );
}

export function getConfiguredRootDomain(): string {
  const raw = import.meta.env.VITE_WEB_ROOT_DOMAIN?.trim?.() || "";
  if (!raw) return PRIMARY_ROOT_DOMAIN;
  const root = toRootDomain(raw);
  if ((PRODUCTION_ROOT_DOMAINS as readonly string[]).includes(root)) return root;
  return root || PRIMARY_ROOT_DOMAIN;
}

export function getPublicApexHost(
  rootDomain = getConfiguredRootDomain(),
): string {
  const root = toRootDomain(rootDomain);
  if (root === SECONDARY_ROOT_DOMAIN) return SECONDARY_PUBLIC_HOST;
  return root;
}

export function webBrandHost(): string {
  return getPublicApexHost();
}

export function getPublicSiteUrl(path = ""): string {
  const host = getPublicApexHost();
  const base = `https://${host}`;
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
