import type { Metadata } from "next";
import AgentsClient from "@/components/new-pages/AgentsClient";
import { PageBottomLinks, PageHero } from "@/components/new-pages/Shared";

export const metadata: Metadata = { title: "Private Agent Payments", description: "Researching confidential spending for Solana AI agents. Join the Zolius builder waitlist.", openGraph: { title: "Private Agent Payments | Zolius Vault", description: "Your agent's spending is your strategy. Join the research waitlist.", images: ["/agents/opengraph-image"] }, twitter: { card: "summary_large_image", title: "Private Agent Payments | Zolius Vault", description: "Your agent's spending is your strategy. Join the research waitlist.", images: ["/agents/opengraph-image"] } };
export default function AgentsPage() { return <div className="np-page"><PageHero eyebrow="Agent finance / research track" title="Private Agent Payments" aside={<span className="np-badge np-badge--amber" style={{fontSize:11,padding:"9px 12px"}}>RESEARCH</span>}>Your agent's spending is your strategy. We are researching private balances and owner-auditable agent payments on Solana.</PageHero><AgentsClient/><PageBottomLinks/></div>; }
