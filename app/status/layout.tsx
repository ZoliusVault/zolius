import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chain & Pool Health Monitor",
  description:
    "Live cryptographic state, Privacy Rings history, and operational parameters of Zolius Vault on Solana Mainnet-Beta.",
  openGraph: {
    title: "Chain & Pool Health Monitor | Zolius Protocol",
    description:
      "Live cryptographic state, Privacy Rings history, and operational parameters of Zolius Vault on Solana Mainnet-Beta.",
    images: ["/og-banner.png"],
  },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
