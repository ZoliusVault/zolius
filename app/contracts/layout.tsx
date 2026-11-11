import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verified Contracts Registry",
  description:
    "Live executable account checks for Helius Privacy Rings and Zolius programs on Solana Devnet.",
  openGraph: {
    title: "Verified Contracts Registry | Zolius Protocol",
    description:
      "Live executable account checks for Helius Privacy Rings and Zolius programs on Solana Devnet.",
    images: ["/og-banner.png"],
  },
};

export default function ContractsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
