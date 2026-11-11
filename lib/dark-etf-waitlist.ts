import { randomBytes } from "node:crypto";

// Pure validation + normalization for the Dark ETF waitlist (no I/O).
// Mirrors the brief: email required, X handle + wallet optional, consent
// required, honeypot + rate limit handled in the route.

export interface WaitlistInput {
  email: unknown;
  xHandle?: unknown;
  wallet?: unknown;
  consent?: unknown;
  source?: unknown;
}

export interface NormalizedWaitlist {
  email: string;
  xHandle: string | null;
  wallet: string | null;
  source: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const X_RE = /^[A-Za-z0-9_]{1,15}$/;
const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;

export function normalizeEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  if (e.length === 0 || e.length > 254) return null;
  return EMAIL_RE.test(e) ? e : null;
}

export function normalizeXHandle(v: unknown): string | null | "invalid" {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") return "invalid";
  const h = v.trim().replace(/^@/, "");
  return X_RE.test(h) ? h : "invalid";
}

export function normalizeWallet(v: unknown): string | null | "invalid" {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") return "invalid";
  const w = v.trim();
  return WALLET_RE.test(w) ? w : "invalid";
}

export function validateWaitlist(input: WaitlistInput):
  | { ok: true; value: NormalizedWaitlist }
  | { ok: false; error: string } {
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, error: "Enter a valid email address." };
  const x = normalizeXHandle(input.xHandle);
  if (x === "invalid")
    return { ok: false, error: "X handle: letters, numbers, underscore, max 15." };
  const wallet = normalizeWallet(input.wallet);
  if (wallet === "invalid")
    return { ok: false, error: "Wallet must be 0x followed by 40 hex characters." };
  if (input.consent !== true)
    return { ok: false, error: "Please accept the consent checkbox to join." };
  let source: string | null = null;
  if (typeof input.source === "string" && input.source.trim().length > 0) {
    source = input.source.trim().slice(0, 120);
  }
  return { ok: true, value: { email, xHandle: x, wallet, source } };
}

export function newConfirmToken(): string {
  return randomBytes(32).toString("hex");
}
