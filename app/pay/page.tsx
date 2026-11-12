import type { Metadata } from "next";
import PayClient from "@/components/new-pages/PayClient";
import { PageBottomLinks, PageHero, DevnetBadge } from "@/components/new-pages/Shared";

export const metadata: Metadata = { title: "Zolius Pay", description: "Create a shareable Solana payment request and settle from private balances.", openGraph: { title: "Zolius Pay | Zolius Vault", description: "Request and send assets through Solana Privacy Rings on Devnet.", images: ["/pay/opengraph-image"] }, twitter: { card: "summary_large_image", title: "Zolius Pay | Zolius Vault", description: "Request and send assets through Solana Privacy Rings on Devnet.", images: ["/pay/opengraph-image"] } };
export default function PayPage() { return <div className="np-page"><PageHero eyebrow="Confidential payment links" title="Zolius Pay" aside={<DevnetBadge />}>A simple request link for a private balance transfer. Sender and recipient remain visible on Solana; asset and amount stay confidential in the Ring.</PageHero><PayClient/><PageBottomLinks/></div>; }
