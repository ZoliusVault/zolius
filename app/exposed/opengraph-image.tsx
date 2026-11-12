import { createPageOg } from "@/components/new-pages/OgImage";
export const alt = "Wallet exposure checker for public Solana activity";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() { return createPageOg("Wallet Exposure", "Public chain data"); }
