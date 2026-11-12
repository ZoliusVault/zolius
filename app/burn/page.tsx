import { MainnetBadge, PageBottomLinks, PageHero, Panel } from "@/components/new-pages/Shared";

export const metadata = {
  title: "$ZOLIUS Supply | Zolius Vault",
  description: "Mainnet token and burn records for Zolius.",
};

export default function BurnPage() {
  return (
    <div className="np-page">
      <PageHero eyebrow="Token supply / on-chain records" title="$ZOLIUS supply" aside={<MainnetBadge />}>Mainnet supply information appears here after a Zolius token mint is published.</PageHero>
      <div className="np-content">
        <Panel eyebrow="Mainnet token registry" title="No Zolius mint is configured">
          <p className="np-muted">There is no Mainnet $ZOLIUS mint or burn history published by this app. This page will show on-chain supply records once a Mainnet token address is configured.</p>
        </Panel>
      </div>
      <PageBottomLinks />
    </div>
  );
}
