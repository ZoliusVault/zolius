import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verified Contracts Registry",
  description:
    "Mainnet protocol address registry for Helius Privacy Rings on Solana Mainnet.",
  openGraph: {
    title: "Verified Contracts Registry | Zolius Protocol",
    description:
      "Mainnet protocol address registry for Helius Privacy Rings on Solana Mainnet.",
    images: ["/contracts/opengraph-image"],
  },
};

export default function ContractsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
