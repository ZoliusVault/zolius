import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chain & Pool Health Monitor",
  description:
    "Live executable account checks for Helius Privacy Rings and Zolius programs on Solana Mainnet.",
  openGraph: {
    title: "Chain & Pool Health Monitor | Zolius Protocol",
    description:
      "Live executable account checks for Helius Privacy Rings and Zolius programs on Solana Mainnet.",
    images: ["/og-banner.png"],
  },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
