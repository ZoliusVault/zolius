import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Architecture & Mathematical Invariants",
  description:
    "Mathematical guarantees, zero-knowledge verification, and non-custodial privacy invariants across the Zolius protocol stack.",
  openGraph: {
    title: "Privacy Architecture | Zolius Protocol",
    description:
      "Mathematical guarantees, zero-knowledge verification, and non-custodial privacy invariants across the Zolius protocol stack.",
    images: ["/og-banner.png"],
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
