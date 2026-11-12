import type { Metadata } from "next";
import PayClient from "@/components/new-pages/PayClient";

export const metadata: Metadata = {
  title: "Zolius Pay Handle",
  description: "Pay a Zolius handle from your private Solana balance.",
  robots: { index: false, follow: false },
};

export default async function PayHandlePage({ params }: { params: Promise<{ handle: string }> }) {
  await params;
  return <PayClient />;
}
