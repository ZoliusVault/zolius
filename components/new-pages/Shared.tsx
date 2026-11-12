import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

export function PageHero({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="np-hero">
      <div>
        <div className="np-eyebrow"><span className="np-signal" />{eyebrow}</div>
        <h1 className="np-title">{title}</h1>
        <p className="np-lede">{children}</p>
      </div>
      {aside && <div className="np-hero-aside">{aside}</div>}
    </div>
  );
}

export function DevnetBadge({ small = false }: { small?: boolean }) {
  return <span className={`np-network${small ? " np-network--small" : ""}`}><span />SOLANA DEVNET</span>;
}

export function Panel({
  title,
  eyebrow,
  children,
  className = "",
}: {
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`np-panel ${className}`}>
      {(title || eyebrow) && <header className="np-panel-head">
        <div>{eyebrow && <div className="np-overline">{eyebrow}</div>}{title && <h2>{title}</h2>}</div>
      </header>}
      {children}
    </section>
  );
}

export function PageBottomLinks() {
  return (
    <nav className="np-bottom-links" aria-label="More Zolius pages">
      <Link href="/contracts">Contracts<ArrowRight size={14} /></Link>
      <Link href="/exposed">Exposure checker<ArrowRight size={14} /></Link>
      <Link href="/proof">Glass vs Vault<ArrowRight size={14} /></Link>
      <Link href="/pay">Zolius Pay<ArrowRight size={14} /></Link>
      <Link href="/otc">Private OTC<ArrowRight size={14} /></Link>
      <Link href="/agents">Agent payments<ArrowRight size={14} /></Link>
    </nav>
  );
}

export function ExplorerLink({ href, children = "View on explorer" }: { href: string; children?: React.ReactNode }) {
  return <a className="np-external" href={href} target="_blank" rel="noreferrer">{children}<ExternalLink size={13} /></a>;
}
