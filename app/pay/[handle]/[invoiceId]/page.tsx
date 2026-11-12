import type { Metadata } from "next";
import PayClient from "@/components/new-pages/PayClient";

export const metadata: Metadata = {
  title: "Zolius Pay Invoice",
  description: "Open an encrypted one-time payment request on Solana.",
  robots: { index: false, follow: false },
};

export default async function PayInvoicePage({ params }: { params: Promise<{ handle: string; invoiceId: string }> }) {
  await params;
  return <PayClient />;
}
