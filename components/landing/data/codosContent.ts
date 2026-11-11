export const codosContent = {
  hero: {
    badge: "Built on Solana Privacy Rings · Quantum-Ready Vault",
    headline: {
      line1: "private",
      line2: "execution"
    },
    tagline: "Confidential transfers, Zolius Swap & Lock, and hybrid post-quantum viewing key protection on Solana.",
    sub: "Self-custodial confidential transfers built on Solana Privacy Rings, protected by hybrid ML-KEM-768 quantum vaults.",
    ctaPrimary: "Launch Vault",
    ctaSecondary: "View Contracts",
    socialProof: {
      builtOn: {
        label: "Built on",
        logos: ["privacy-rings"]
      },
      buildersFrom: {
        label: "Audited Core & Ecosystem",
        logos: ["solana"]
      }
    }
  },
  problem: {
    kicker: "THE PROBLEM",
    statements: [
      {
        head: "Every public on-chain transfer exposes your balance and trade size.",
        sub: "Public explorers broadcast your exact holdings, payroll, and trading size to competitors."
      },
      {
        head: "Harvest now, decrypt later threatens long-term viewing keys.",
        sub: "Adversaries store encrypted traces today to break them with future quantum computers."
      },
      {
        head: "Zolius Vault encrypts assets and viewing keys with post-quantum defense.",
        sub: "Solana Privacy Rings confidential balances backed by hybrid X-Wing ML-KEM-768 encryption."
      }
    ]
  },
  setupLead: "Here’s how Zolius Vault works.",
  steps: [
    {
      number: "Step 1",
      title: "Deposit publicly into Solana Privacy Rings",
      badge: "Public Deposit → Confidential Balance",
      sessionId: "Ring 1 · SOL / USDC / SPL",
      sampleQuote: "Deposits are public on-chain. Once inside the Privacy Ring, your asset balances, amounts, and transfer memos remain strictly confidential.",
      controls: ["Deposit (Public)", "Confidential Balance", "Solana Mainnet", "Quantum Vault Backup"]
    },
    {
      number: "Step 2",
      title: "Transfer confidentially across Shielded Addresses",
      badge: "Encrypted Asset & Amount",
      desc: "Send SOL, USDC, or Token-2022 without revealing token amounts or memos. Note: Sender and recipient addresses remain visible on-chain."
    },
    {
      number: "Step 3",
      title: "Protect viewing keys with Quantum Vault",
      badge: "Hybrid Post-Quantum X-Wing",
      desc: "Viewing keys and account backups are encrypted with hybrid X25519 + ML-KEM-768 (X-Wing). Share audit access with revocable permissions."
    },
    {
      number: "Step 4",
      title: "Withdraw to any standard Solana wallet",
      badge: "Self-Custodial Public Exit",
      desc: "Withdrawals settle back onto public Solana state with your signature. Exit anytime with complete non-custodial independence."
    }
  ],
  whoItIsFor: {
    kicker: "WHO IT'S FOR",
    title: "Built for institutions, traders, and teams who need on-chain confidentiality.",
    cards: [
      {
        title: "DAOs & Treasury Operations",
        range: "Private Payroll & Grants",
        body: "Distribute confidential salaries, contractor payments, and OTC grants without broadcasting wallet treasury balances to the public."
      },
      {
        title: "Trading Desks & Whales",
        range: "Confidential Liquidity",
        body: "Rebalance assets and settle private OTC swaps without signaling position sizes or allowing predatory competitors to track your strategy."
      },
      {
        title: "Audited & Regulated Teams",
        range: "Selective Compliance",
        body: "Share post-quantum encrypted viewing keys with authorized tax accountants or auditors on-demand, without compromising permanent privacy."
      }
    ]
  },
  comparison: {
    kicker: "TRANSPARENCY",
    title: "What is public. What is confidential.",
    subtitle: "Honest visibility boundaries on Solana Privacy Rings.",
    rows: [
      {
        metric: "Token Amount & Balance",
        diy: "100% visible on Solscan",
        veil: "Confidential (Encrypted in Ring)"
      },
      {
        metric: "Transfer Memo & Asset",
        diy: "Plaintext public",
        veil: "Confidential (Encrypted in Ring)"
      },
      {
        metric: "Sender & Recipient Wallet",
        diy: "Public on-chain",
        veil: "Public on-chain (Default Ring)"
      },
      {
        metric: "Deposit & Withdrawal",
        diy: "Public transaction",
        veil: "Public transaction"
      },
      {
        metric: "Viewing Key Longevity",
        diy: "Vulnerable to harvest attacks",
        veil: "Quantum-ready (ML-KEM-768)"
      }
    ]
  },
  howItWorks: {
    kicker: "ARCHITECTURE",
    title: "Built on Solana Privacy Rings — Zero Custom Circuits.",
    steps: [
      {
        time: "Base Ring",
        name: "Solana Privacy Rings Core",
        body: "Official Solana Privacy Program (ring1GaL...ANW) audited by Certora, OtterSec, and zkSecurity.",
        barW: "33%",
        indent: "0%"
      },
      {
        time: "Zolius Layer",
        name: "Zolius Swap & Zolius Lock",
        body: "Confidential OTC swap and timelocked escrow programs communicating with Privacy Rings via CPI.",
        barW: "42%",
        indent: "28%"
      },
      {
        time: "Vault Security",
        name: "Quantum Vault (X-Wing)",
        body: "Off-chain hybrid post-quantum key encapsulation (X25519 + ML-KEM-768) protecting viewing keys and backups.",
        barW: "52%",
        indent: "48%"
      }
    ]
  },
  team: {
    kicker: "CORE TECH",
    title: "Audited foundations, resilient post-quantum engineering.",
    members: [
      {
        name: "Privacy Rings Core",
        role: "Underlying Protocol",
        background: "Open-source Solana Privacy Rings protocol with verified Groth16 zk-SNARK circuits.",
        photo: "/assets/dima-updated.jpg"
      },
      {
        name: "Quantum Vault",
        role: "Off-Chain Cryptography",
        background: "Hybrid post-quantum key encapsulation using ML-KEM-768 (X-Wing) via noble cryptography.",
        photo: "/assets/gleb-updated.jpg"
      },
      {
        name: "Zolius Swap & Lock",
        role: "Solana CPI Programs",
        background: "Confidential OTC escrow and timelock contracts built with verifiable solana-verify builds.",
        photo: "/assets/rahul-updated.jpg"
      },
      {
        name: "Veil Migration Portal",
        role: "Community Continuity",
        background: "Permanent non-custodial exit portal and bridge route to Solana.",
        photo: "/assets/kevin-simback.jpg"
      }
    ]
  },
  faq: {
    kicker: "FAQ",
    title: "Frequently asked questions.",
    items: [
      {
        q: "What does Zolius Vault hide and what remains public?",
        a: "Under the default Solana Privacy Ring, token balances, transferred amounts, and memos are encrypted and confidential. Note: Sender and recipient addresses remain visible on-chain. Deposit and withdrawal events are also public on-chain."
      },
      {
        q: "How does Zolius Vault relate to Helius?",
        a: "Zolius Vault is an independent project built on the open Solana Privacy Rings protocol and uses the Helius Privacy API for RPC, indexer, and prover services. It is not affiliated with or endorsed by Helius."
      },
      {
        q: "What is the Quantum Vault feature?",
        a: "While on-chain transactions use Groth16 proofs, Quantum Vault is an off-chain layer that encrypts your viewing keys and transaction backups with hybrid post-quantum cryptography (X25519 + ML-KEM-768 / X-Wing), protecting your data against 'harvest now, decrypt later' threats."
      },
      {
        q: "Can anyone freeze my confidential funds?",
        a: "Zolius Vault is strictly self-custodial: every transfer or withdrawal requires your wallet's cryptographic signature. Withdrawals cannot be frozen by any intermediary."
      }
    ]
  },
  closing: {
    title: "Ready to explore confidential DeFi on Solana?",
    sub: "Deposit into Solana Privacy Rings, trade with Zolius Swap, and secure your viewing keys with Quantum Vault.",
    ctaPrimary: "Launch Vault",
    ctaSecondary: "View Contracts"
  },
  footer: {
    tagline: "Independent confidential vault built on Solana Privacy Rings.",
    disclaimer: "Zolius Vault is an independent project built on the open Solana Privacy Rings protocol. Not affiliated with or endorsed by Helius.",
    email: "contact@zolius.vault",
    columns: [
      {
        title: "Protocol",
        links: ["Confidential Transfers", "Zolius Swap", "Zolius Lock", "Quantum Vault"]
      },
      {
        title: "Developers",
        links: ["Solana Privacy Rings", "Program Contracts", "Verifiable Builds"]
      },
      {
        title: "Security & Audits",
        links: ["Certora Audit", "OtterSec Audit", "zkSecurity Audit", "Bug Bounty"]
      },
      {
        title: "Migration",
        links: ["Veil Legacy Exit", "Token Migration", "Terms of Service"]
      }
    ]
  }
};
