"use client";

import React from "react";

export interface StockLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const STOCK_IMG_MAP: Record<string, string> = {
  NVDA: "/tokens/nvda.svg",
  TSLA: "/tokens/tsla.svg",
  AAPL: "/tokens/aapl.svg",
  MSFT: "/tokens/msft.svg",
  SPY: "/tokens/spy.svg",
};

/**
 * Official Stock Token Logo (Real brand asset from financial exchange CDN)
 */
export const StockTokenLogo: React.FC<{
  symbol: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ symbol, size = 24, className = "", style = {} }) => {
  const sym = symbol.toUpperCase();
  const src = STOCK_IMG_MAP[sym] || "/tokens/spy.svg";

  return (
    <img
      src={src}
      alt={`${sym} logo`}
      width={size}
      height={size}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        objectFit: "contain",
        ...style,
      }}
    />
  );
};

export const NvidiaLogo: React.FC<StockLogoProps> = (props) => <StockTokenLogo symbol="NVDA" {...props} />;
export const TeslaLogo: React.FC<StockLogoProps> = (props) => <StockTokenLogo symbol="TSLA" {...props} />;
export const AppleLogo: React.FC<StockLogoProps> = (props) => <StockTokenLogo symbol="AAPL" {...props} />;
export const MicrosoftLogo: React.FC<StockLogoProps> = (props) => <StockTokenLogo symbol="MSFT" {...props} />;
export const SpyLogo: React.FC<StockLogoProps> = (props) => <StockTokenLogo symbol="SPY" {...props} />;

export const getStockLogo = (symbol: string): React.FC<StockLogoProps> => {
  const sym = symbol.toUpperCase();
  return function BoundStockLogo(props: StockLogoProps) {
    return <StockTokenLogo symbol={sym} {...props} />;
  };
};
