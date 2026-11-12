import { ImageResponse } from "next/og";

export function createPageOg(title: string, kicker: string, accent = "#ff8c00") {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "66px 76px", color: "#171411", background: "#f7f5f0", fontFamily: "Georgia, serif", position: "relative" }}>
      <div style={{ position: "absolute", right: -90, top: -180, width: 620, height: 620, border: `1px solid ${accent}44`, borderRadius: 999, display: "flex" }}><div style={{ margin: 62, width: 492, height: 492, border: `1px solid ${accent}33`, borderRadius: 999, display: "flex" }} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 15, fontSize: 22, fontWeight: 700, letterSpacing: 1 }}><div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg,${accent},#ed45d4)`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 27 }}>Z</div>ZOLIUS VAULT</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 920 }}><div style={{ color: accent, fontFamily: "monospace", fontSize: 18, letterSpacing: 3, textTransform: "uppercase" }}>{kicker}</div><div style={{ fontSize: 76, lineHeight: 1.04, letterSpacing: -3 }}>{title}</div><div style={{ fontFamily: "monospace", fontSize: 21, color: "#5f5b55" }}>Private finance on Solana · ZoliusVault.tech</div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "monospace", fontSize: 15, color: "#6b665e" }}><span style={{ width: 8, height: 8, borderRadius: 8, background: accent }} /> SOLANA DEVNET</div>
    </div>,
    { width: 1200, height: 630 },
  );
}
