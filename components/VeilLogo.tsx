"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export interface ZoliusMarkProps {
  size?: number | string;
  color?: string;
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Geometric "Z" logo mark for Zolius Protocol.
 */
export const ZoliusMark: React.FC<ZoliusMarkProps> = ({
  size = 32,
  color,
  accentColor,
  className = "",
  style = {},
}) => {
  const numSize = typeof size === "number" ? size : parseInt(String(size), 10) || 32;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "22%",
        overflow: "hidden",
        ...style,
      }}
    >
      <Image
        src="/zolius-logo.webp"
        alt="Zolius"
        width={numSize}
        height={numSize}
        priority
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </span>
  );
};

export const VeilMark = ZoliusMark;

export interface ZoliusLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  ariaLabel?: string;
  color?: string;
  accentColor?: string;
}

const SIZE_CONFIG = {
  sm: { icon: 26, text: "15px", gap: "8px" },
  md: { icon: 34, text: "18px", gap: "10px" },
  lg: { icon: 42, text: "22px", gap: "12px" },
  xl: { icon: 52, text: "26px", gap: "14px" },
};

/**
 * Official Zolius Protocol brand wordmark & logo.
 */
export const ZoliusLogo: React.FC<ZoliusLogoProps> = ({
  href = "/",
  size = "md",
  className = "",
  ariaLabel = "Zolius Protocol",
  color,
}) => {
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;

  const content = (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: config.gap,
        userSelect: "none",
      }}
    >
      <ZoliusMark size={config.icon} />
      <span
        style={{
          fontFamily: "var(--font-headline, sans-serif)",
          fontWeight: 700,
          fontSize: config.text,
          letterSpacing: "-0.03em",
          color: color || "var(--color-text, #111111)",
          lineHeight: 1,
        }}
      >
        ZOLIUS
      </span>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        style={{
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          lineHeight: 1,
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
};

export const VeilLogo = ZoliusLogo;
export default ZoliusLogo;
