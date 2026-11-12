import type { Metadata } from "next";
import OtcClient from "@/components/new-pages/OtcClient";
import { PageBottomLinks, PageHero, MainnetBadge } from "@/components/new-pages/Shared";

export const metadata: Metadata = { title: "Private OTC", description: "Zolius Swap Mainnet deployment is pending; production proof artifacts are ready.", openGraph: { title: "Private OTC | Zolius Vault", description: "Invitation-only fixed-price swaps settle privately through Solana Privacy Rings.", images: ["/otc/opengraph-image"] }, twitter: { card: "summary_large_image", title: "Private OTC | Zolius Vault", description: "Move size through private balances using an invitation-only fixed price.", images: ["/otc/opengraph-image"] } };
export default function OtcPage() { return <div className="np-page"><PageHero eyebrow="Fixed-price / invitation only" title="Private OTC" aside={<MainnetBadge />}>The production verifier and browser proof keys are ready; Mainnet program deployment is pending.</PageHero><OtcClient/><PageBottomLinks/></div>; }
