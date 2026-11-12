import type { Metadata } from "next";
import ProofClient from "@/components/new-pages/ProofClient";
import { MainnetBadge, PageBottomLinks, PageHero } from "@/components/new-pages/Shared";

export const metadata: Metadata = {
  title: "Glass vs Vault",
  description: "Compare a public Solana token transfer with a Zolius confidential transfer on Mainnet.",
  openGraph: { title: "Glass vs Vault | Zolius Vault", description: "Compare a public token transfer with a confidential transfer on the same network.", images: ["/proof/opengraph-image"] },
  twitter: { card: "summary_large_image", title: "Glass vs Vault | Zolius Vault", description: "Compare a public token transfer with a confidential transfer on the same network.", images: ["/proof/opengraph-image"] },
};

export default function ProofPage() {
  return <div className="np-page"><PageHero eyebrow="Transaction visibility / side-by-side" title="Glass vs Vault" aside={<MainnetBadge />}>Compare a standard public token transfer with a confidential transfer through Solana Privacy Rings. They use the same network, but expose different transaction data.</PageHero><div className="np-content"><ProofClient /></div><PageBottomLinks /></div>;
}
