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
    category: "INSPECT",
    title: "Solana Programs",
    description: "Program addresses, verification records, and the privacy stack behind each route.",
    theme: "programs",
  },
  {
    href: "/exposed",
    icon: ScanSearch,
    category: "INVESTIGATE",
    title: "Wallet Exposure",
    description: "Read the balances and activity that remain visible on a public address.",
    theme: "exposure",
  },
  {
    href: "/proof",
    icon: Eye,
    category: "UNDERSTAND PRIVACY",
    title: "Glass vs Vault",
    description: "See what the chain reveals in a public transfer, then compare it with a Zolius private transfer.",
    theme: "proof",
    wide: true,
  },
  {
    href: "/pay",
    icon: Fingerprint,
    category: "REQUEST",
    title: "Zolius Pay",
    description: "Create a payment request designed for a confidential balance transfer.",
    theme: "pay",
  },
  {
    href: "/otc",
    icon: ArrowLeftRight,
    category: "SETTLE PRIVATELY",
    title: "Private OTC",
    description: "Settle a negotiated amount directly between private balances.",
    theme: "otc",
  },
  {
    href: "/agents",
    icon: Bot,
    category: "OWNER CONTROL",
    title: "Agent Payments",
    description: "Explore a path to private agent spending with owner-visible controls.",
    theme: "agents",
    wide: true,
  },
];

export function ExplorePagesSection() {
  return (
    <section id="explore" className="landing-explore" aria-labelledby="landing-explore-title">
      <div className="landing-explore__inner">
        <header className="landing-explore__heading">
          <div>
            <p className="landing-explore__eyebrow"><span aria-hidden="true" />ZOLIUS / QUANTUM PRIVACY STACK</p>
            <h2 id="landing-explore-title">Enter the privacy stack.</h2>
          </div>
          <p>Six purpose-built instruments. One route into confidential finance on Solana.</p>
        </header>

        <div className="landing-explore__grid">
          {destinations.map(({ href, icon: Icon, category, title, description, theme, wide }) => (
            <Link
              className={`landing-explore__card landing-explore__card--${theme}${wide ? " landing-explore__card--wide" : ""}`}
              href={href}
              key={href}
            >
              <div className="landing-explore__art" aria-hidden="true">
                <span className="landing-explore__orbit landing-explore__orbit--one" />
                <span className="landing-explore__orbit landing-explore__orbit--two" />
                <span className="landing-explore__art-core"><Icon size={27} strokeWidth={1.35} /></span>
              </div>
              <div className="landing-explore__card-copy">
                <span className="landing-explore__category">{category}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <span className="landing-explore__open">
                <span>OPEN MODULE</span>
                <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
