import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service & Usage Tenets",
  description:
    "Protocol usage rules, non-custodial responsibility, and user sovereignty guidelines for Veil smart contracts.",
  openGraph: {
    title: "Terms of Service | Zolius Protocol",
    description:
      "Protocol usage rules, non-custodial responsibility, and user sovereignty guidelines for Veil smart contracts.",
    images: ["/og-banner.png"],
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
