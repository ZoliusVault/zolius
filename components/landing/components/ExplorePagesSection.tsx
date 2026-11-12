import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Bot,
  Eye,
  Fingerprint,
  Landmark,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

const destinations = [
  {
    href: "/proof",
    icon: Eye,
    label: "START HERE · UNDERSTAND PRIVACY",
    title: "Glass vs Vault",
    description: "See what a public transfer exposes, then compare it with a confidential transfer through the Ring.",
    kind: "feature",
    wide: true,
  },
  {
    href: "/contracts",
    icon: Landmark,
    label: "VERIFY THE STACK",
    title: "Solana Programs",
    description: "Inspect program addresses, verification details, and protocol dependencies.",
  },
  {
    href: "/exposed",
    icon: ScanSearch,
    label: "CHECK A WALLET",
    title: "Wallet Exposure",
    description: "Review the balances and on-chain activity that are public for an address.",
  },
  {
    href: "/pay",
    icon: Fingerprint,
    label: "REQUEST A PAYMENT",
    title: "Zolius Pay",
    description: "Create a request for a confidential balance transfer.",
  },
  {
    href: "/otc",
    icon: ArrowLeftRight,
    label: "SETTLE PRIVATELY",
    title: "Private OTC",
    description: "Arrange a negotiated transfer between private balances.",
  },
  {
    href: "/agents",
    icon: Bot,
    label: "QUANTUM FINANCE · RESEARCH",
    title: "Agent Payments",
    description: "Explore owner-controlled private spending for autonomous agents.",
    kind: "agent",
    wide: true,
  },
];

export function ExplorePagesSection() {
  return (
    <section id="explore" className="landing-explore" aria-labelledby="landing-explore-title">
      <div className="landing-explore__inner">
        <header className="landing-explore__heading">
          <div>
            <p className="landing-explore__eyebrow"><span aria-hidden="true" />QUANTUM PRIVACY / DESTINATIONS</p>
            <h2 id="landing-explore-title">Explore the Zolius stack.</h2>
          </div>
          <p className="landing-explore__intro">Six clear paths into confidential finance on Solana—from understanding the Ring to using it.</p>
          <div className="landing-explore__count" aria-label="Six destinations">
            <strong>06</strong><span>DESTINATIONS</span>
          </div>
        </header>

        <div className="landing-explore__grid">
          {destinations.map(({ href, icon: Icon, label, title, description, kind, wide }) => (
            <Link
              className={`landing-explore__card${wide ? " landing-explore__card--wide" : ""}${kind ? ` landing-explore__card--${kind}` : ""}`}
              href={href}
              key={href}
            >
              {kind === "feature" ? (
                <div className="landing-explore__comparison" aria-hidden="true">
                  <div className="landing-explore__comparison-side">
                    <Eye size={19} strokeWidth={1.6} />
                    <span>PUBLIC</span>
                    <i />
                    <i />
                    <i />
                  </div>
                  <ArrowLeftRight className="landing-explore__comparison-arrow" size={17} strokeWidth={1.5} />
                  <div className="landing-explore__comparison-side landing-explore__comparison-side--private">
                    <ShieldCheck size={19} strokeWidth={1.6} />
                    <span>SHIELDED</span>
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              ) : (
                <span className="landing-explore__icon" aria-hidden="true"><Icon size={21} strokeWidth={1.55} /></span>
              )}
              <div className="landing-explore__card-copy">
                <span className="landing-explore__label">{label}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <span className="landing-explore__open">OPEN PAGE <ArrowUpRight size={15} strokeWidth={1.7} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
