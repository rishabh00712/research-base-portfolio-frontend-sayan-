// src/components/Loader.jsx
//
// Full-screen first-visit loader: a counter runs 0 -> 100, then the crimson
// curtain slides up and reveals the page underneath.
//
// Timing:
//   - never shorter than MIN_MS (1s)
//   - never longer than MAX_MS (4s), even if the page is slow
//   - otherwise it finishes as soon as the page, fonts are ready (after MIN_MS)
// Plus ~0.35s to run the counter up to 100 and EXIT_MS for the curtain.

import React, { useEffect, useRef, useState } from "react";
import theme from "../theme";

const MIN_MS = 1000;
const MAX_MS = 4000;
const FINISH_MS = 350; // counter runs from where it is to 100
const HOLD_MS = 250; // pause on 100 before the curtain lifts
const EXIT_MS = 900; // curtain slide-up

const c = theme.colors;

export default function Loader({ label = "Chatterjee Lab", onDone }) {
  const [value, setValue] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const readyRef = useRef(false);

  // Page + fonts ready?
  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) readyRef.current = true;
    };

    const pageLoaded = new Promise((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", resolve, { once: true });
    });
    const fontsLoaded = document.fonts?.ready ?? Promise.resolve();

    Promise.all([pageLoaded, fontsLoaded]).then(markReady, markReady);
    return () => {
      cancelled = true;
    };
  }, []);

  // Counter animation + hand-off to the curtain
  useEffect(() => {
    let raf;
    let finishStart = null;
    let finishFrom = 0;
    let holdTimer;
    let exitTimer;
    const start = performance.now();

    const tick = (t) => {
      const elapsed = t - start;
      let v;

      if (finishStart === null) {
        // Crawl toward ~90 while waiting
        v = 90 * (1 - Math.exp(-elapsed / 900));
        const canFinish = (readyRef.current && elapsed >= MIN_MS) || elapsed >= MAX_MS;
        if (canFinish) {
          finishStart = t;
          finishFrom = v;
        }
      } else {
        const p = Math.min(1, (t - finishStart) / FINISH_MS);
        const eased = 1 - Math.pow(1 - p, 3);
        v = finishFrom + (100 - finishFrom) * eased;
        if (p >= 1) {
          setValue(100);
          holdTimer = window.setTimeout(() => {
            setLeaving(true);
            exitTimer = window.setTimeout(() => onDone?.(), EXIT_MS);
          }, HOLD_MS);
          return; // stop the loop
        }
      }

      setValue(Math.round(v));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(holdTimer);
      window.clearTimeout(exitTimer);
    };
  }, [onDone]);

  // Lock page scroll while the loader is on screen
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className={`ld-root${leaving ? " is-leaving" : ""}`}
      role="progressbar"
      aria-label="Loading the site"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <style>{`
        .ld-root {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: clamp(20px, 4vw, 48px);
          box-sizing: border-box;
          background: ${c.loaderBg};
          color: ${c.loaderText};
          font-family: ${theme.fonts.body};
          border-radius: 0;
          transform: translateY(0);
          transition:
            transform ${EXIT_MS}ms cubic-bezier(.76, 0, .24, 1),
            border-radius ${EXIT_MS}ms cubic-bezier(.76, 0, .24, 1);
          will-change: transform;
        }
        /* The curtain rises with a softly curved bottom edge */
        .ld-root.is-leaving {
          transform: translateY(-100%);
          border-radius: 0 0 50% 50% / 0 0 12vh 12vh;
        }
        .ld-label {
          margin: 0;
          font-size: clamp(14px, 1.6vw, 18px);
          font-weight: 500;
          letter-spacing: .02em;
          color: ${c.loaderTextSoft};
        }
        .ld-count {
          display: flex;
          align-items: baseline;
          line-height: .85;
          font-family: ${theme.fonts.heading};
          font-weight: 400;
          font-variant-numeric: tabular-nums;
          font-size: clamp(96px, 24vw, 280px);
          letter-spacing: -.03em;
        }
        .ld-percent {
          margin-left: .08em;
          font-size: .32em;
          color: ${c.loaderTextSoft};
          letter-spacing: 0;
        }
        .ld-track {
          height: 2px;
          margin-top: clamp(16px, 3vw, 32px);
          background: ${c.loaderTrack};
          overflow: hidden;
        }
        .ld-bar {
          height: 100%;
          width: 100%;
          background: ${c.loaderBar};
          transform-origin: left center;
        }
        @media (prefers-reduced-motion: reduce) {
          .ld-root { transition-duration: .01ms; }
        }
      `}</style>

      <p className="ld-label">{label}</p>

      <div>
        <div className="ld-count" aria-hidden="true">
          <span>{value}</span>
          <span className="ld-percent">%</span>
        </div>
        <div className="ld-track" aria-hidden="true">
          <div className="ld-bar" style={{ transform: `scaleX(${value / 100})` }} />
        </div>
      </div>
    </div>
  );
}