import type { Metadata } from "next";
import OtcClient from "@/components/new-pages/OtcClient";
import { PageBottomLinks, PageHero, MainnetBadge } from "@/components/new-pages/Shared";

export const metadata: Metadata = { title: "Private OTC", description: "Mainnet OTC is paused because Zolius Swap has no production deployment.", openGraph: { title: "Private OTC | Zolius Vault", description: "Mainnet OTC is unavailable; use Privacy Rings for deposits, transfers, and withdrawals.", images: ["/otc/opengraph-image"] }, twitter: { card: "summary_large_image", title: "Private OTC | Zolius Vault", description: "Move size through private balances using an invitation-only fixed price.", images: ["/otc/opengraph-image"] } };
export default function OtcPage() { return <div className="np-page"><PageHero eyebrow="Fixed-price / invitation only" title="Private OTC" aside={<MainnetBadge />}>OTC quotes are paused on Mainnet while the Zolius Swap program is prepared for production.</PageHero><OtcClient/><PageBottomLinks/></div>; }
