"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, Cpu, LogOut, Copy, Check, ChevronDown, Menu, Search, ShieldCheck, WalletCards, X as CloseIcon, Shield, FileText, ExternalLink } from "lucide-react";
import { WalletModal } from "./WalletModal";
import { ZoliusLogo } from "./VeilLogo";
import { SolanaLogo, XLogo } from "./TokenLogos";
import {
  SOLANA_WALLETS,
  loadWallet,
  clearWallet,
  subscribeWalletChange,
  silentSolanaAccount,
  type SolanaWalletId,
} from "@/lib/wallets";

export function Navbar() {
  const pathname = usePathname();
  const [wallet, setWallet] = useState<{ id: SolanaWalletId; address: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);

  // Close the wallet menu on outside click or Escape (standard disclosure).
  useEffect(() => {
    if (!isMenuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!walletMenuRef.current?.contains(e.target as Node)) setIsMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const sync = () => {
      const saved = loadWallet();
      setWallet(saved);
      if (saved) {
        silentSolanaAccount(saved.id).then((fresh) => {
          if (!fresh) {
            // disconnected in extension
            clearWallet();
          }
        });
      }
    };

    sync();
    const unsub = subscribeWalletChange(sync);
    return () => unsub();
  }, []);

  const handleCopy = () => {
    if (!wallet?.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    clearWallet();
    setIsMenuOpen(false);
  };

  const walletMeta = wallet ? SOLANA_WALLETS.find((w) => w.id === wallet.id) : null;

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          width: "100%",
          backgroundColor: "transparent",
          borderBottom: "1px solid rgba(26, 26, 26, 0.06)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "var(--page-max)",
            margin: "0 auto",
            padding: "0 var(--page-gutter)",
            height: "68px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxSizing: "border-box",
          }}
        >
          {/* Left: Back Button & Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <Link
              href="/"
              className="group lp-btn lp-btn--outline"
              aria-label="Back to Home"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                color: "var(--color-text)",
                textDecoration: "none",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-body-sm)",
                fontWeight: 500,
              }}
            >
              <ArrowLeft
                size={14}
                className="transition-transform duration-200 group-hover:-translate-x-0.5"
                style={{ color: "var(--color-muted)" }}
              />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>

            <div
              style={{
                width: "1px",
                height: "24px",
                backgroundColor: "var(--color-border)",
                margin: "0 6px",
              }}
            />

            <ZoliusLogo href="/" size="md" />
            {pathname === "/dark-etf" && (
              <span
                className="hidden sm:inline-flex"
                style={{
                  alignItems: "center",
                  padding: "2px 8px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(255, 140, 0, 0.12)",
                  border: "1px solid rgba(255, 140, 0, 0.3)",
                  color: "var(--color-accent)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Coming soon
              </span>
            )}
          </div>

          {/* Right: Network Indicator & Multi-Wallet Connect */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", position: "relative" }}>
            <div
              className="hidden md:inline-flex"
              style={{
                alignItems: "center",
                height: "2.25rem",
                flexShrink: 0,
              }}
              title="Solana Mainnet"
            >
              <SolanaLogo height={22} style={{ opacity: 0.92 }} />
            </div>


            <a
              href="https://x.com/ZoliusVault"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Official X (Twitter) Account @ZoliusVault"
              title="Official X: @ZoliusVault"
              className="lp-btn lp-btn--filled hidden sm:inline-flex"
              style={{
                width: "2.25rem",
                height: "2.25rem",
                minHeight: "2.25rem",
                padding: 0,
                flexShrink: 0,
              }}
            >
              <XLogo size={15} color="currentColor" />
            </a>

            {pathname !== "/app" && pathname !== "/trade" && (
              <Link
                href="/app"
                className="lp-btn lp-btn--filled hidden sm:inline-flex"
                style={{
                  minHeight: "2.25rem",
                  height: "2.25rem",
                  padding: "0 14px",
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 600,
                }}
              >
                <span>Launch Vault</span>
                <span aria-hidden="true">→</span>
              </Link>
            )}

            {wallet ? (
              <div style={{ position: "relative" }} ref={walletMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-haspopup="true"
                  aria-expanded={isMenuOpen}
                  aria-label={`Wallet ${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}, open account menu`}
                  className="lp-btn lp-btn--outline"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--color-text)",
                    fontFamily: "monospace",
                    fontSize: "var(--text-body-sm)",
                    fontWeight: 600,
                    minHeight: "2.25rem",
                    padding: "0 12px",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                  }}
                >
                  {walletMeta && (
                    <img
                      src={walletMeta.icon}
                      alt={walletMeta.name}
                      width={18}
                      height={18}
                      style={{ borderRadius: "4px" }}
                    />
                  )}
                  <span>
                    {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                  </span>
                  <ChevronDown size={14} className="text-neutral-400" />
                </button>

                {isMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      width: "250px",
                      backgroundColor: "#ffffff",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border-strong)",
                      boxShadow: "0 12px 32px rgba(26, 26, 26, 0.12)",
                      padding: "6px",
                      zIndex: 50,
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 10px",
                        fontSize: "11px",
                        fontFamily: "monospace",
                        color: "var(--color-muted)",
                        borderBottom: "1px solid var(--color-border)",
                        marginBottom: "4px",
                      }}
                    >
                      <div>Connected via {walletMeta?.name || "Solana Wallet"}</div>
                      <div style={{ marginTop: "2px", color: "var(--color-text)", fontWeight: 600 }}>
                        Solana Mainnet
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopy}
                      aria-label={copied ? "Address copied to clipboard" : "Copy wallet address"}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        backgroundColor: "transparent",
                        fontSize: "12px",
                        fontFamily: "var(--font-body)",
                        color: "var(--color-text)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                      className="hover:bg-slate-50"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copied ? "Address Copied!" : "Copy Address"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnect}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        backgroundColor: "transparent",
                        fontSize: "12px",
                        fontFamily: "var(--font-body)",
                        color: "var(--color-danger-ink)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                      className="hover:bg-red-50"
                    >
                      <LogOut size={14} aria-hidden="true" />
                      <span>Disconnect Wallet</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="lp-btn lp-btn--filled"
                style={{
                  minHeight: "2.25rem",
                  padding: "0 var(--space-4)",
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 500,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M12 12h.01" />
                  <path d="M17 12h.01" />
                  <path d="M7 12h.01" />
                </svg>
                <span>Connect Wallet</span>
              </button>
            )}

            {/* Mobile Navigation Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsNavDrawerOpen(true)}
              aria-label="Open Navigation Menu"
              className="inline-flex lp-btn lp-btn--outline"
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text)",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
              }}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer Modal */}
      {isNavDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setIsNavDrawerOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.45)",
              backdropFilter: "blur(2px)",
            }}
          />

          {/* Drawer Panel */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "320px",
              height: "100%",
              backgroundColor: "#ffffff",
              boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.18)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "var(--space-5)",
              boxSizing: "border-box",
              zIndex: 101,
              overflowY: "auto",
            }}
          >
            <div>
              {/* Drawer Top / Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "16px",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <ZoliusLogo href="/" size="md" />
                <button
                  type="button"
                  onClick={() => setIsNavDrawerOpen(false)}
                  aria-label="Close navigation menu"
                  className="lp-btn lp-btn--outline"
                  style={{
                    width: "32px",
                    height: "32px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-text)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              {/* Navigation Links */}
              <nav style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "18px" }}>
                {[
                  { href: "/app", label: "Zolius Vault Terminal", icon: Shield, active: pathname === "/app" },
                  { href: "/exposed", label: "Wallet Exposure", icon: Search, active: pathname === "/exposed" },
                  { href: "/proof", label: "Glass vs Vault", icon: ShieldCheck, active: pathname === "/proof" },
                  { href: "/pay", label: "Zolius Pay", icon: WalletCards, active: pathname.startsWith("/pay") },
                  { href: "/otc", label: "Private OTC", icon: ArrowLeftRight, active: pathname === "/otc" },
                  { href: "/agents", label: "Private Agents", icon: Cpu, active: pathname === "/agents", badge: "Research" },
                  { href: "/contracts", label: "Contracts Registry", icon: FileText, active: pathname === "/contracts" },
                  { href: "/privacy", label: "Privacy Policy", icon: FileText, active: pathname === "/privacy" },
                  { href: "/terms", label: "Terms of Service", icon: FileText, active: pathname === "/terms" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsNavDrawerOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: item.active ? "rgba(255, 140, 0, 0.08)" : "transparent",
                        color: item.active ? "var(--color-accent-ink)" : "var(--color-text)",
                        border: item.active ? "1px solid rgba(255, 140, 0, 0.25)" : "1px solid transparent",
                        textDecoration: "none",
                        fontWeight: item.active ? 700 : 500,
                        fontSize: "13.5px",
                        fontFamily: "var(--font-body)",
                        transition: "all var(--duration-fast)",
                      }}
                    >
                      <Icon size={16} style={{ color: item.active ? "var(--color-accent-ink)" : "var(--color-muted)" }} />
                      <span>{item.label}</span>
                      {"badge" in item && typeof (item as { badge?: string }).badge === "string" && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "rgba(255,140,0,0.12)",
                            color: "var(--color-accent-ink)",
                            marginLeft: "auto",
                          }}
                        >
                          {(item as { badge?: string }).badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom */}
            <div
              style={{
                paddingTop: "16px",
                borderTop: "1px solid var(--color-border)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <a
                href="https://x.com/ZoliusVault"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-btn lp-btn--filled"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  textDecoration: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <XLogo size={14} color="currentColor" />
                <span>Follow @ZoliusVault on X</span>
              </a>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-muted)",
                }}
              >
                <span>Solana Mainnet</span>
                <span>Privacy Ring</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <WalletModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPick={(_id, _addr) => {
          setIsModalOpen(false);
        }}
      />
    </>
  );
}
