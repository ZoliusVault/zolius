"use client";

import React from "react";
import { VeilMark } from "./VeilLogo";

export interface LogoProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Ethereum Diamond Mark SVG
 */
export const EthLogo: React.FC<LogoProps> = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 256 417"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
  >
    <path d="M127.961 0L125.166 9.5V285.168L127.961 287.958L255.923 212.32L127.961 0Z" fill="#343434" />
    <path d="M127.962 0L0 212.32L127.962 287.958V157.252V0Z" fill="#8C8C8C" />
    <path d="M127.962 312.187L126.386 314.106V413.404L127.962 417L255.998 236.593L127.962 312.187Z" fill="#3C3C3B" />
    <path d="M127.962 417V312.187L0 236.593L127.962 417Z" fill="#8C8C8C" />
    <path d="M127.961 287.958L255.922 212.32L127.961 157.253V287.958Z" fill="#141414" />
    <path d="M0 212.32L127.962 287.958V157.253L0 212.32Z" fill="#393939" />
  </svg>
);

/**
 * Official Veil Protocol Token Glyph SVG (Halftone "V" Mark from application)
 */
export const VeilLogoMark: React.FC<LogoProps> = ({
  size = 16,
  className = "",
  color = "currentColor",
}) => (
  <VeilMark
    size={size}
    className={className}
    color={color}
    accentColor="#FF8A00"
  />
);

/**
 * Official Solana Logo (Wordmark + 3-bars from hero section)
 */
export const SolanaLogo: React.FC<{
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ height = 24, className = "", style = {} }) => (
  <img
    src="/assets/logo/solana-black.svg"
    alt="Solana"
    style={{
      height: typeof height === "number" ? `${height}px` : height,
      width: "auto",
      display: "block",
      ...style,
    }}
    className={className}
  />
);

/**
 * Solana 3-Bars Glyph SVG
 */
export const SolanaLogoMark: React.FC<LogoProps> = ({
  size = 16,
  className = "",
  color = "currentColor",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 398 312"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
  >
    <path fill={color} d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
    <path fill={color} d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
    <path fill={color} d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>
  </svg>
);

/**
 * Dynamic token logo by asset / symbol
 */
export const TokenIcon: React.FC<{
  symbol?: string;
  asset?: string;
  size?: number;
  className?: string;
}> = ({ symbol, asset, size = 16, className = "" }) => {
  const sym = (symbol || "").toUpperCase();
  const isEth =
    sym === "ETH" ||
    sym === "WETH" ||
    asset === "0x0000000000000000000000000000000000000000" ||
    (asset && asset.toLowerCase() === "0x0bd7d308f8e1639fab988df18a8011f41eacad73"); // mainnet WETH

  const isVeil =
    sym === "VEIL" ||
    (asset && asset.toLowerCase() === "0x019086f63407fadf0ccb89516e465baef5031aa9") || // testnet VEIL
    (asset && asset.toLowerCase() === "0xe0e11ec0d62eda12de796d025d6334fadfe5ab2a"); // mainnet temp VEIL (canonical added at Pons cutover)

  if (isEth) return <EthLogo size={size} className={className} />;
  if (isVeil) return <VeilLogoMark size={size} className={className} />;
  return null;
};

/**
 * Official X (formerly Twitter) Logo Mark SVG
 */
export const XLogo: React.FC<LogoProps> = ({
  size = 16,
  className = "",
  color = "currentColor",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
  >
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);
