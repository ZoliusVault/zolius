import type { Metadata } from "next";
import { QuantumVaultPanel } from "@/components/trade/QuantumVaultPanel";

export const metadata: Metadata = {
  title: "Quantum Vault | Zolius Vault",
  description: "X-Wing encrypted Solana account backups, expiring viewing shares, and private transaction notes.",
};

export default function VaultPage() {
  return <QuantumVaultPanel />;
}
