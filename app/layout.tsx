import type { Metadata } from "next";
import "./globals.css";
import { AppLayoutWrapper } from "../components/AppLayoutWrapper";

export const metadata: Metadata = {
  metadataBase: new URL("https://zolius.vault"),
  title: {
    default: "Zolius Vault — Self-Custodial Confidential Transfers on Solana",
    template: "%s | Zolius Vault",
  },
  description:
    "Self-custodial confidential transfers built on Solana Privacy Rings, protected by hybrid ML-KEM-768 quantum vaults.",
  keywords: [
    "Zolius Vault",
    "Solana",
    "Privacy Rings",
    "Helius Privacy API",
    "Confidential Transfers",
    "ML-KEM-768",
    "Token-2022",
    "Quantum Vault",
    "X-Wing",
    "Self-Custodial",
  ],
  authors: [{ name: "Zolius Vault" }],
  creator: "@ZoliusVault",
  openGraph: {
    title: "Zolius Vault — Self-Custodial Confidential Transfers on Solana",
    description:
      "Self-custodial confidential transfers built on Solana Privacy Rings, protected by hybrid ML-KEM-768 quantum vaults.",
    url: "https://zolius.vault",
    siteName: "Zolius Vault",
    images: [
      {
        url: "/og-banner.png",
        width: 1200,
        height: 630,
        alt: "Zolius Vault — Self-Custodial Confidential Transfers on Solana",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@ZoliusVault",
    creator: "@ZoliusVault",
    title: "Zolius Vault — Self-Custodial Confidential Transfers on Solana",
    description:
      "Self-custodial confidential transfers built on Solana Privacy Rings, protected by hybrid ML-KEM-768 quantum vaults.",
    images: ["/og-banner.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/zolius-logo.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="lp-on">
      <body className="min-h-screen flex flex-col antialiased relative overflow-x-hidden" style={{ color: "var(--color-text)" }}>
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
      </body>
    </html>
  );
}
