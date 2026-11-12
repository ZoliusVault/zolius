import type { Metadata } from "next";
import ContractsRegistry from "@/components/new-pages/ContractsRegistry";

export const metadata: Metadata = {
  title: "Contracts Registry",
  description: "The canonical registry of Zolius and Solana Privacy Rings addresses currently used on Mainnet.",
  openGraph: { title: "Contracts Registry | Zolius Vault", description: "Verified addresses, deployment receipts, and network status for Zolius on Solana Mainnet.", images: ["/contracts/opengraph-image"] },
  twitter: { card: "summary_large_image", title: "Contracts Registry | Zolius Vault", description: "Verified addresses, deployment receipts, and network status for Zolius on Solana Mainnet.", images: ["/contracts/opengraph-image"] },
};

export default function ContractsPage() {
  return <ContractsRegistry />;
}
