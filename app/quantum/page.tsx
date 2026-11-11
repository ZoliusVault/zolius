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
      status: "BUILDING",
      badgeColor: "#B45309",
      description:
        "Planned hybrid encryption for viewing-key and backup material, designed to reduce harvest-now-decrypt-later exposure. The current Devnet app does not yet encrypt or store these backups.",
      details: [
        "Explore a hybrid X25519 + ML-KEM-768 (X-Wing) design",
        "Define encrypted backup and device restore flows",
        "Test key lifecycle and recovery before shipping",
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", width: "100%" }}>
      {/* Editorial Header (aligned with Privacy Policy & Landing) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          paddingBottom: "var(--space-5)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-muted)",
              marginBottom: "var(--space-2)",
            }}
          >
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(255, 140, 0, 0.1)",
                border: "1px solid rgba(255, 140, 0, 0.25)",
                color: "var(--color-accent-ink)",
                fontWeight: 700,
              }}
            >
              SOLANA // ML-KEM-768
            </span>
            <span>// Post-Quantum Cryptography Specification</span>
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-headline)",
              fontSize: "clamp(2rem, 3.2vw, 2.6rem)",
              lineHeight: 1.15,
              color: "var(--color-text)",
              letterSpacing: "-0.02em",
              fontWeight: 600,
            }}
          >
            Quantum Vault Roadmap &amp; Architecture
          </h1>
          <p
            style={{
              margin: "var(--space-2) 0 0 0",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-body-sm)",
              color: "var(--color-muted)",
              maxWidth: "760px",
              lineHeight: "1.65",
            }}
          >
            Solana Privacy Rings currently protects private transfers with Groth16 zk-SNARKs. Quantum Vault is Zolius's roadmap for post-quantum hybrid viewing-key encryption (X-Wing KEM: X25519 + ML-KEM-768); it is not yet wired into the Devnet app.
          </p>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--color-muted)",
          }}
        >
          <span>ML-KEM-768</span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span>X-Wing Lattice</span>
          <span style={{ opacity: 0.3 }}>/</span>
          <span>FIPS 203 Ready</span>
        </div>
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
            The Quantum Vault is a <strong>roadmap</strong>, not a currently shipped protection layer. The Devnet app uses the Privacy Rings protocol's Groth16 proofs; post-quantum viewing-key encryption and encrypted backup flows remain planned work.
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
            Explore private SOL on Devnet while Quantum Vault is being built.
          </h3>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--color-muted)" }}>
            Current transfers use Solana Privacy Rings. Post-quantum viewing-key protection remains on the roadmap.
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
