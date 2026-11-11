import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verified Contracts Registry",
  description:
    "Verified programs and deployment addresses on Solana Mainnet-Beta. Program IDs, Privacy Rings, and Quantum Vault specs.",
  openGraph: {
    title: "Verified Contracts Registry | Zolius Protocol",
    description:
      "Verified programs and deployment addresses on Solana Mainnet-Beta. Program IDs, Privacy Rings, and Quantum Vault specs.",
    images: ["/og-banner.png"],
  },
};

export default function ContractsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
