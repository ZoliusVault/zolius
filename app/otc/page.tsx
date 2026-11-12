import type { Metadata } from "next";
import OtcClient from "@/components/new-pages/OtcClient";
import { PageBottomLinks, PageHero, DevnetBadge } from "@/components/new-pages/Shared";

export const metadata: Metadata = { title: "Private OTC", description: "Invitation-only fixed-price settlement through Zolius Swap on Solana Devnet.", openGraph: { title: "Private OTC | Zolius Vault", description: "Move size through private balances using an invitation-only fixed price.", images: ["/otc/opengraph-image"] }, twitter: { card: "summary_large_image", title: "Private OTC | Zolius Vault", description: "Move size through private balances using an invitation-only fixed price.", images: ["/otc/opengraph-image"] } };
export default function OtcPage() { return <div className="np-page"><PageHero eyebrow="Fixed-price / invitation only" title="Private OTC" aside={<DevnetBadge />}>Settle a negotiated price between private balances without routing through the public market. Order terms stay private; wallet identities remain visible.</PageHero><OtcClient/><PageBottomLinks/></div>; }
