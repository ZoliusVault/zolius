import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function DarkEtfOg() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#141210",
          color: "#f5f1e8",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 4, color: "#ff8c00", fontWeight: 700 }}>
          VEIL DARK ETF · COMING SOON
        </div>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, marginTop: 16, display: "flex", flexDirection: "column" }}>
          <span>Your own ETF.</span>
          <span>Nobody sees what&apos;s inside.</span>
        </div>
        <div style={{ fontSize: 30, color: "#b8b0a1", marginTop: 20 }}>
          Private baskets of tokens on Solana · zolius.vault
        </div>
      </div>
    ),
    { ...size }
  );
}
