const ALLOWED_PRIVACY_HOST = "devnet.helius-rpc.com";

export function resolveHeliusPrivacyUrl(endpoint: string, pathSegments: readonly string[]): URL {
  const upstream = new URL(endpoint);
  if (
    upstream.protocol !== "https:" ||
    upstream.hostname !== ALLOWED_PRIVACY_HOST ||
    upstream.username ||
    upstream.password ||
    upstream.pathname !== "/" ||
    !upstream.searchParams.get("api-key")
  ) {
    throw new Error("Configure a server-side Helius Devnet RPC URL with its API key.");
  }

  if (
    pathSegments.length < 2 ||
    pathSegments[0] !== "v1" ||
    pathSegments[1] !== "spr" ||
    pathSegments.some((segment) => !/^[a-zA-Z0-9_-]+$/.test(segment))
  ) {
    throw new Error("Only Helius Privacy Rings API paths are allowed.");
  }

  upstream.pathname = `/${pathSegments.join("/")}`;
  return upstream;
}
