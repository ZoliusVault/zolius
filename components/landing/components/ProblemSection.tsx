"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { codosContent } from "../data/codosContent";
import { DecodeText } from "./DecodeText";

gsap.registerPlugin(ScrollTrigger);

export const ProblemSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [hasStepped, setHasStepped] = useState(false);
  const { problem } = codosContent;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let lastStep = 0;

    const pin = ScrollTrigger.create({
      id: "problemPin",
      trigger: el,
      start: "top top",
      end: "+=380%",
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      snap: {
        snapTo: (value) => {
          // Allow natural, unconstrained exit at the extremes
          if (value < 0.05) return 0;
          if (value > 0.93) return 1;

          // Snap to the comfortable center of each statement band
          if (value < 0.34) return 0.16;
          if (value < 0.67) return 0.50;
          return 0.84;
        },
        duration: { min: 0.25, max: 0.45 },
        delay: 0.2,
        ease: "power2.out",
        inertia: false,
      },
      onUpdate: (self) => {
        const step = Math.min(2, Math.floor(self.progress * 3));
        if (step === lastStep) return;
        lastStep = step;
        setActiveStep(step);
        setHasStepped(true);
      },
    });

    return () => {
      pin.kill();
    };
  }, []);

  const statement = problem.statements[activeStep];

  return (
    <section
      id="problem"
      ref={sectionRef}
      aria-label="The AI impact gap"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "transparent",
        height: "100svh",
        minHeight: "100svh",
        padding: "0 var(--page-gutter)",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* Top Flex Spacer - this is where the morphing particle stays centered! */}
      <div style={{ flex: "1 1 auto", minHeight: 0, position: "relative" }} />

      {/* Bottom Text Area */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          flex: "0 0 auto",
          display: "grid",
          placeItems: "start center",
          minHeight: "clamp(12rem, 30svh, 16rem)",
          paddingBottom: "clamp(1.5rem, 6svh, 4rem)",
        }}
      >
        <div style={{ gridArea: "1 / 1", width: "100%", opacity: 1 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-headline)",
              fontSize: "clamp(2.3rem, 3.5vw, 4rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              fontWeight: "var(--font-weight-regular)",
              color: "var(--color-text)",
              textAlign: "center",
              textWrap: "balance",
              maxWidth: "min(94vw, 28ch)",
              marginInline: "auto",
            }}
          >
            <DecodeText key={statement.head} text={statement.head} autoPlay={hasStepped} />
          </p>
          <p
            style={{
              margin: "var(--space-3) auto 0",
              fontFamily: "var(--font-body)",
              fontSize: "var(--text-intro)",
              lineHeight: "var(--leading-intro)",
              color: "var(--color-muted)",
              textAlign: "center",
              textWrap: "balance",
              maxWidth: "min(90vw, 34ch)",
            }}
          >
            {statement.sub}
          </p>
        </div>
      </div>
    </section>
  );
};
