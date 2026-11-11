import type { Metadata } from "next";
import { PrivacyAssetsPanel } from "@/components/trade/PrivacyAssetsPanel";

export const metadata: Metadata = {
  title: "Private Assets & History | Zolius Vault",
  description: "Deposit, privately send, withdraw, and recover Solana Privacy Rings assets and history.",
};

export default function PrivateAssetsPage() {
  return <PrivacyAssetsPanel />;
}
