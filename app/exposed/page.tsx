import type { Metadata } from "next";
import ExposedClient from "@/components/new-pages/ExposedClient";
import { MainnetBadge, PageBottomLinks, PageHero } from "@/components/new-pages/Shared";

export const metadata: Metadata = {
  title: "Wallet Exposure Checker",
  description: "See the balances and recent activity publicly visible on Solana Mainnet.",
  openGraph: { title: "Wallet Exposure Checker | Zolius Vault", description: "Paste any Solana address. See what the public chain reveals.", images: ["/exposed/opengraph-image"] },
  twitter: { card: "summary_large_image", title: "Wallet Exposure Checker | Zolius Vault", description: "Paste any Solana address. See what the public chain reveals.", images: ["/exposed/opengraph-image"] },
};

export default function ExposedPage() {
  return <div className="np-page"><PageHero eyebrow="Public data / no identity labels" title="Wallet Exposure Checker" aside={<MainnetBadge />}>Paste any Solana address. See the balances and activity that are public on Mainnet. This page never looks up a person behind an address.</PageHero><div className="np-content"><ExposedClient /></div><PageBottomLinks /></div>;
}
