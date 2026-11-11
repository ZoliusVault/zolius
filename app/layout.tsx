import type { Metadata } from "next";
import "./globals.css";
import { AppLayoutWrapper } from "../components/AppLayoutWrapper";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.zoliusvault.tech"),
  title: {
    default: "Zolius Vault — Private Finance on Solana",
    template: "%s | Zolius Vault",
  },
  description:
    "Confidential finance on Solana, with quantum-resilient viewing-key protection and self-custody by design.",
  keywords: [
    "Zolius Vault",
    "Solana",
    "Privacy Rings",
    "Helius Privacy API",
    "Confidential Transfers",
    "Quantum Vault",
    "Self-Custodial",
  ],
  authors: [{ name: "Zolius Vault" }],
  creator: "@ZoliusVault",
  openGraph: {
    title: "Zolius Vault — Private Finance on Solana",
    description:
      "Confidential finance on Solana, with quantum-resilient viewing-key protection and self-custody by design.",
    url: "https://www.zoliusvault.tech",
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
      "Confidential finance on Solana, with quantum-resilient viewing-key protection and self-custody by design.",
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
