import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Cpu, Key, Lock, ArrowRight, CheckCircle2, Terminal, AlertTriangle, Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Quantum Vault Roadmap & Architecture | Zolius Vault",
  description:
    "Post-quantum hybrid viewing key encryption: ML-KEM-768 (X-Wing lattice), selective audit disclosure, and Groth16 zero-knowledge state verifications on Solana.",
};

export default function QuantumPage() {
  const roadmapItems = [
    {
      id: "w1",
      title: "Encrypted Vault Backup",
      spec: "Hybrid X-Wing KEM (X25519 + ML-KEM-768) + XChaCha20-Poly1305",
      status: "LIVE ON-CHAIN",
      badgeColor: "#059669",
      description:
        "Deterministic key derivation from wallet signature (ZOLIUS/vault/v1). Viewing keys, token notes, and account preferences encrypted off-chain against harvest-now-decrypt-later attacks.",
      details: [
        "Uses audited @noble/post-quantum and @noble/curves libraries",
        "Deterministic offline restore on any device with same wallet",
        "Zero server custody — ciphertext stored in browser and IPFS backup",
      ],
      tag: "Workstream 1",
    },
    {
      id: "w2",
      title: "Selective Auditor Sharing",
      spec: "X-Wing Public Key Encapsulation with Ephemeral Time-Bound Delegation",
      status: "BUILDING",
      badgeColor: "#B45309",
      description:
        "Enables users to provide read-only decrypt capability to accountants, tax advisors, or compliance officers without exposing spending authority or master keys.",
      details: [
        "Cryptographic proof of non-disclosure to third parties",
        "Configurable expiration timestamp per shared viewing session",
        "Selective transaction masking (e.g. share only specific tax year notes)",
      ],
      tag: "Workstream 2",
    },
    {
      id: "w3",
      title: "Encrypted Transaction Notes & Invoices",
      spec: "Off-chain AEAD payload bound to Solana Transaction Signature",
      status: "BUILDING",
      badgeColor: "#B45309",
      description:
        "Attach private memo notes, invoices, and accounting tags to confidential transfers without publishing metadata to Solana public state.",
      details: [
        "Indexed via Helius Privacy API webhook proxy",
        "Decrypted client-side using account viewing key",
        "Non-linkable to sender or receiver public keys",
      ],
      tag: "Workstream 3",
    },
    {
      id: "w4",
      title: "Post-Quantum Proof Systems (STARKs)",
      spec: "Lattice-based / STARK recursion over Solana Privacy Rings",
      status: "RESEARCH",
      badgeColor: "#4b5563",
      description:
        "Long-term research track into post-quantum zero-knowledge proof generation. Note: v1 Privacy Rings uses Groth16 zk-SNARKs for on-chain state verification.",
      details: [
        "Benchmarking prover latency on mobile and browser environments",
        "Tracking Helius and Solana Foundation post-quantum research",
        "Future upgrade path when STARK verification becomes cost-effective on SVM",
      ],
      tag: "Workstream 4",
    },
  ];

  return (
    <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", padding: "48px var(--page-gutter)" }}>
      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "4px 12px",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "rgba(255, 140, 0, 0.1)",
            border: "1px solid rgba(255, 140, 0, 0.25)",
            color: "var(--color-accent-ink)",
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.06em",
            marginBottom: "16px",
          }}
        >
          // POST-QUANTUM CRYPTOGRAPHY SPECIFICATION
        </div>
        <h1
          style={{
            fontSize: "clamp(2rem, 3.5vw, 3rem)",
            fontFamily: "var(--font-headline)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--color-text)",
            margin: "0 0 12px 0",
            lineHeight: 1.15,
          }}
        >
          Quantum Vault Roadmap &amp; Architecture
        </h1>
        <p
          style={{
            fontSize: "15px",
            fontFamily: "var(--font-body)",
            color: "var(--color-muted)",
            maxWidth: "760px",
            lineHeight: "1.65",
            margin: 0,
          }}
        >
          Solana Privacy Rings protects token amounts on-chain with Groth16 zk-SNARKs. Quantum Vault introduces post-quantum hybrid viewing key encryption (X-Wing KEM: X25519 + ML-KEM-768) to protect transaction history against harvest-now-decrypt-later adversaries.
        </p>
      </div>

      {/* Cryptographic Honesty Notice Card */}
      <div
        style={{
          padding: "20px 24px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid rgba(255, 140, 0, 0.3)",
          backgroundColor: "#ffffff",
          boxShadow: "0 4px 16px rgba(255, 140, 0, 0.05)",
          marginBottom: "36px",
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            backgroundColor: "rgba(255, 140, 0, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-accent-ink)",
            flexShrink: 0,
            marginTop: "2px",
          }}
        >
          <ShieldCheck size={20} />
        </div>
        <div>
          <h3
            style={{
              margin: "0 0 6px 0",
              fontSize: "14.5px",
              fontWeight: 700,
              color: "var(--color-text)",
              fontFamily: "var(--font-headline)",
            }}
          >
            Cryptographic Honesty Notice
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              lineHeight: "1.6",
              color: "var(--color-muted)",
            }}
          >
            Zolius Vault provides a <strong>quantum-ready vault</strong> for viewing keys, note metadata, and off-chain backups. We do <strong>not</strong> make misleading claims of &quot;full quantum-proof privacy&quot; because on-chain validity proofs in Privacy Rings v1 are Groth16. Every layer displays its verified implementation status below.
          </p>
        </div>
      </div>

      {/* Architecture Spec Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            padding: "20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            backgroundColor: "#ffffff",
            boxShadow: "0 2px 10px rgba(26, 26, 26, 0.03)",
          }}
        >
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-faint)", textTransform: "uppercase" }}>
            Viewing Key Encryption
          </div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)", marginTop: "4px" }}>
            ML-KEM-768 (FIPS 203)
          </div>
          <p style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "6px", lineHeight: "1.5" }}>
            NIST-standardized lattice-based key encapsulation mechanism combined with classical X25519 in hybrid X-Wing mode.
          </p>
        </div>

        <div
          style={{
            padding: "20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            backgroundColor: "#ffffff",
            boxShadow: "0 2px 10px rgba(26, 26, 26, 0.03)",
          }}
        >
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-faint)", textTransform: "uppercase" }}>
            On-Chain Zero-Knowledge
          </div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)", marginTop: "4px" }}>
            Groth16 (BN254 Curve)
          </div>
          <p style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "6px", lineHeight: "1.5" }}>
            High-efficiency zk-SNARK verifying ring signatures and nullifier uniqueness in sub-second compute units on Solana.
          </p>
        </div>

        <div
          style={{
            padding: "20px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border)",
            backgroundColor: "#ffffff",
            boxShadow: "0 2px 10px rgba(26, 26, 26, 0.03)",
          }}
        >
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-faint)", textTransform: "uppercase" }}>
            Key Derivation Standard
          </div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)", marginTop: "4px" }}>
            ZOLIUS/vault/v1
          </div>
          <p style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "6px", lineHeight: "1.5" }}>
            Deterministic seed derivation from standard Solana Ed25519 signature with zero storage of unencrypted private keys.
          </p>
        </div>
      </div>

      {/* Roadmap Ledger Workstreams */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div
          style={{
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--color-muted)",
          }}
        >
          // Cryptographic Workstreams &amp; Milestones
        </div>

        {roadmapItems.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "28px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              backgroundColor: "#ffffff",
              boxShadow: "0 4px 20px -2px rgba(26, 26, 26, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--color-accent-ink)", fontWeight: 700, textTransform: "uppercase" }}>
                  {item.tag}
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "4px 0 0 0", color: "var(--color-text)", fontFamily: "var(--font-headline)" }}>
                  {item.title}
                </h2>
                <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--color-muted)", marginTop: "4px" }}>
                  {item.spec}
                </div>
              </div>

              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  backgroundColor: `${item.badgeColor}18`,
                  color: item.badgeColor,
                  border: `1px solid ${item.badgeColor}33`,
                }}
              >
                {item.status}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: "13.5px", lineHeight: "1.65", color: "var(--color-muted)" }}>
              {item.description}
            </p>

            <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {item.details.map((detail, idx) => (
                <li key={idx} style={{ fontSize: "13px", color: "var(--color-muted)", lineHeight: "1.5" }}>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Action Footer Callout */}
      <div
        style={{
          marginTop: "48px",
          padding: "32px",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "#ffffff",
          border: "1px solid var(--color-border-strong)",
          boxShadow: "0 8px 30px rgba(26, 26, 26, 0.05)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", fontWeight: 700, color: "var(--color-text)" }}>
            Ready to initialize your Quantum Vault?
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)" }}>
            Derive your viewing key in one click and access confidential transfers on Solana.
          </p>
        </div>
        <Link
          href="/app"
          className="lp-btn lp-btn--filled"
          style={{
            padding: "0 20px",
            minHeight: "2.5rem",
            fontSize: "14px",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>Open Vault Terminal</span>
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
