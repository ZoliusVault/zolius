import Link from "next/link";
import {
  ArrowUpRight,
  ArrowLeftRight,
  Bot,
  Eye,
  Fingerprint,
  Landmark,
  ScanSearch,
} from "lucide-react";

const destinations = [
  {
    href: "/contracts",
    icon: Landmark,
    category: "PROTOCOL",
    title: "Solana Programs",
    description: "Inspect deployed program addresses, verification details, and dependencies.",
  },
  {
    href: "/exposed",
    icon: ScanSearch,
    category: "WALLET TOOL",
    title: "Exposure Checker",
    description: "See the token balances and on-chain activity that a wallet makes public.",
  },
  {
    href: "/proof",
    icon: Eye,
    category: "LEARN",
    title: "Glass vs Vault",
    description: "Compare what a public transfer reveals with a confidential Ring transfer.",
  },
  {
    href: "/pay",
    icon: Fingerprint,
    category: "PAYMENTS",
    title: "Zolius Pay",
    description: "Create a payment request for a confidential transfer.",
  },
  {
    href: "/otc",
    icon: ArrowLeftRight,
    category: "PRIVATE MARKETS",
    title: "Private OTC",
    description: "Arrange a negotiated transfer between private balances.",
  },
  {
    href: "/agents",
    icon: Bot,
    category: "RESEARCH",
    title: "Agent Payments",
    description: "Explore owner-auditable private spending for autonomous agents.",
  },
];

export function ExplorePagesSection() {
  return (
    <section id="explore" className="landing-explore" aria-labelledby="landing-explore-title">
      <div className="landing-explore__inner">
        <header className="landing-explore__heading">
          <div>
            <p className="landing-explore__eyebrow">ZOLIUS DIRECTORY / PRODUCTS &amp; TOOLS</p>
            <h2 id="landing-explore-title">Explore the protocol</h2>
          </div>
          <p>Choose a destination. Each page has one clear job and a direct path back to the vault.</p>
        </header>

        <div className="landing-explore__grid">
          {destinations.map(({ href, icon: Icon, category, title, description }) => (
            <Link className="landing-explore__card" href={href} key={href}>
              <div className="landing-explore__card-top">
                <span className="landing-explore__icon"><Icon size={18} strokeWidth={1.7} /></span>
                <span className="landing-explore__category">{category}</span>
                <ArrowUpRight className="landing-explore__arrow" size={18} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="landing-explore__route">zoliusvault.tech{href}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
