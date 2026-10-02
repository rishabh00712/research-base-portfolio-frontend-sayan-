// src/components/EmojiBar.jsx
//
// Floating emoji reaction bar (bottom-left, so it never collides with the
// AI chat orb at bottom-right).
//
// Backend URL comes from your frontend .env (Vite):
//   VITE_BACKEND_URL=http://localhost:5000
// Restart `npm run dev` after editing .env.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import theme from "../theme";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/+$/, "");

const c = theme.colors;
const STORAGE_KEY = "ej_last_reaction";
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_CLOSE_MS = 10000;

// Gradient colors for each emoji live in theme.jsx (colors.reactions)
const REACTIONS = [
  { type: "wow", emoji: "🤩", label: "Wow", tooltip: "Utterly dazzling!", ...c.reactions.wow },
  { type: "happy", emoji: "😃", label: "Happy", tooltip: "Pure delight!", ...c.reactions.happy },
  { type: "meh", emoji: "🫤", label: "Meh", tooltip: "Just so-so", ...c.reactions.meh },
  { type: "pleading", emoji: "🥺", label: "Moved", tooltip: "Deeply touching", ...c.reactions.pleading },
  { type: "sad", emoji: "😭", label: "Sad", tooltip: "Heart aches", ...c.reactions.sad },
];

const EMPTY_COUNTS = Object.fromEntries(REACTIONS.map(({ type }) => [type, 0]));

function readLastReaction() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.time !== "number" || !parsed.type) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLastReaction(value) {
  try {
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage failures (private mode, quota)
  }
}

function formatRemaining(ms) {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default function EmojiBar() {
  const [reactions, setReactions] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastReaction, setLastReaction] = useState(() => readLastReaction());
  const [now, setNow] = useState(() => Date.now());
  const [justReacted, setJustReacted] = useState(null);
  const [error, setError] = useState("");
  const [isDismissed, setIsDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [hovering, setHovering] = useState(false);

  const total = Object.values(reactions).reduce((sum, v) => sum + v, 0);

  const cooldownRemaining = useMemo(() => {
    if (!lastReaction) return 0;
    return Math.max(0, COOLDOWN_MS - (now - lastReaction.time));
  }, [lastReaction, now]);
  const isLocked = cooldownRemaining > 0;

  const previewReaction = useMemo(() => {
    if (lastReaction) return REACTIONS.find((r) => r.type === lastReaction.type) || REACTIONS[0];
    return REACTIONS[0];
  }, [lastReaction]);

  // Tick the cooldown clock
  useEffect(() => {
    if (!isLocked) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [isLocked]);

  // Load counts
  useEffect(() => {
    let cancelled = false;
    fetch(`${BACKEND_URL}/api/reactions`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load reactions");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setReactions(
          Object.fromEntries(
            REACTIONS.map(({ type }) => [type, Math.max(0, Number(data?.[type]) || 0)])
          )
        );
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-close after 10s, paused while the pointer or focus is inside the bar
  useEffect(() => {
    if (!expanded || hovering) return undefined;
    const id = window.setTimeout(() => setExpanded(false), AUTO_CLOSE_MS);
    return () => window.clearTimeout(id);
  }, [expanded, hovering]);

  // Clear the error after a few seconds
  useEffect(() => {
    if (!error) return undefined;
    const id = window.setTimeout(() => setError(""), 4000);
    return () => window.clearTimeout(id);
  }, [error]);

  const handleReact = useCallback(
    async (type) => {
      if (isLocked || isSaving) return;
      const previousCounts = reactions;
      const previousLast = lastReaction;
      const t = Date.now();

      setReactions((cur) => ({ ...cur, [type]: cur[type] + 1 }));
      setNow(t);
      setLastReaction({ type, time: t });
      writeLastReaction({ type, time: t });
      setJustReacted(type);
      setError("");
      setIsSaving(true);

      try {
        const res = await fetch(`${BACKEND_URL}/api/reactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        if (!res.ok) throw new Error("Could not save reaction");
      } catch {
        setReactions(previousCounts);
        setLastReaction(previousLast);
        writeLastReaction(previousLast);
        setError("Couldn't save your reaction. Try again in a bit.");
      } finally {
        setIsSaving(false);
        window.setTimeout(() => setJustReacted(null), 600);
      }
    },
    [isLocked, isSaving, reactions, lastReaction]
  );

  if (isDismissed) return null;

  return (
    <div
      className="ej-root"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
    >
      <style>{`
        .ej-root {
          position: fixed;
          left: 24px;
          bottom: 24px;
          z-index: 50;
          font-family: ${theme.fonts.body};
          color: ${c.textPrimary};
          max-width: calc(100vw - 48px);
          padding-top: 16px;
        }
        .ej-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 12px 9px;
          border: 1px solid ${c.emojiBarBorder};
          border-radius: 999px;
          background: ${c.emojiBarBg};
          box-shadow: 0 6px 18px ${c.emojiShadow};
          transition: opacity .35s ease, box-shadow .35s ease;
        }
        .ej-bar.is-collapsed { opacity: .6; box-shadow: 0 3px 10px ${c.emojiShadowSoft}; }
        .ej-bar.is-collapsed:hover,
        .ej-bar.is-collapsed:focus-within { opacity: 1; box-shadow: 0 6px 18px ${c.emojiShadow}; }

        .ej-emoji-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border: none;
          border-radius: 50%;
          font-size: 23px;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform .15s ease, box-shadow .15s ease, opacity .15s ease;
        }
        .ej-emoji-btn:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.1);
          box-shadow: 0 4px 10px ${c.emojiShadow};
        }
        .ej-emoji-btn:active:not(:disabled) { transform: scale(.96); }
        .ej-emoji-btn:focus-visible,
        .ej-toggle-btn:focus-visible,
        .ej-close-btn:focus-visible { outline: 2px solid ${c.accent}; outline-offset: 2px; }
        .ej-emoji-btn:disabled { cursor: default; }
        .ej-emoji-btn.is-selected {
          box-shadow: 0 0 0 2.5px ${c.emojiSelectedRing} inset, 0 4px 10px ${c.emojiShadow};
        }
        .ej-emoji-btn.is-locked:not(.is-selected) { opacity: .4; }
        .ej-emoji-btn.is-pop { animation: ej-pop .5s cubic-bezier(.34, 1.56, .64, 1); }
        @keyframes ej-pop {
          0% { transform: scale(1); }
          40% { transform: scale(1.35) rotate(-8deg); }
          70% { transform: scale(.92) rotate(4deg); }
          100% { transform: scale(1) rotate(0); }
        }

        .ej-tooltip {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          padding: 5px 10px;
          border-radius: 8px;
          background: ${c.emojiTooltipBg};
          color: ${c.emojiTooltipText};
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity .15s ease, transform .15s ease;
          z-index: 10;
        }
        .ej-tooltip::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: ${c.emojiTooltipBg};
        }
        .ej-emoji-btn:hover .ej-tooltip,
        .ej-emoji-btn:focus-visible .ej-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }

        .ej-count-dot {
          position: absolute;
          top: -9px;
          right: -7px;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          border-radius: 999px;
          background: ${c.emojiBadgeBg};
          color: ${c.emojiBadgeText};
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 2;
        }

        .ej-toggle-btn,
        .ej-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border: none;
          border-radius: 50%;
          background: transparent;
          color: ${c.emojiMuted};
          cursor: pointer;
          flex-shrink: 0;
          transition: background .2s ease, color .2s ease;
        }
        .ej-toggle-btn:hover { background: ${c.emojiBarBorder}; color: ${c.textHover}; }
        .ej-toggle-btn svg { width: 14px; height: 14px; }
        .ej-close-btn { font-size: 15px; line-height: 1; background: ${c.heroTagBg}; }
        .ej-close-btn:hover { background: ${c.emojiBarBorder}; color: ${c.accent}; }

        .ej-divider { width: 1.5px; height: 26px; margin: 0 3px; background: ${c.emojiBarBorder}; flex-shrink: 0; }
        .ej-total-chip { padding: 0 8px 0 4px; font-size: 13px; font-weight: 600; color: ${c.emojiMuted}; white-space: nowrap; }
        .ej-cooldown-chip { padding: 0 6px 0 0; font-size: 12px; font-weight: 600; color: ${c.accent}; white-space: nowrap; }
        .ej-error {
          margin: 8px 4px 0;
          max-width: 260px;
          font-size: 12px;
          font-weight: 600;
          color: ${c.emojiError};
        }

        /* Expand / collapse. Only the wrapper clips while animating; once
           open it is overflow:visible so tooltips and badges aren't cut off. */
        .ej-expand-wrap { display: grid; overflow: hidden; transition: grid-template-columns .5s ease-in-out; }
        .ej-expand-wrap.is-open { overflow: visible; }
        .ej-expand-inner {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          opacity: 0;
          visibility: hidden;
          transition: opacity .4s ease-in-out, visibility 0s linear .5s;
        }
        .ej-expand-wrap.is-open .ej-expand-inner {
          opacity: 1;
          visibility: visible;
          transition: opacity .4s ease-in-out .15s, visibility 0s;
        }

        @media (max-width: 600px) {
          .ej-root { left: 12px; bottom: 16px; }
          .ej-bar { gap: 3px; padding: 9px 7px 6px; }
          .ej-emoji-btn { width: 36px; height: 36px; font-size: 20px; }
          .ej-total-chip, .ej-cooldown-chip { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
        }
      `}</style>

      <div className={`ej-bar${expanded ? "" : " is-collapsed"}`} role="group" aria-label="React to this site">
        {!expanded && (
          <>
            <button
              type="button"
              className="ej-emoji-btn"
              style={{ background: `linear-gradient(135deg, ${previewReaction.from}, ${previewReaction.to})` }}
              aria-label="Show reaction options"
              onClick={() => setExpanded(true)}
            >
              {previewReaction.emoji}
              {reactions[previewReaction.type] > 0 && (
                <span className="ej-count-dot" aria-hidden="true">
                  {reactions[previewReaction.type] > 99 ? "99+" : reactions[previewReaction.type]}
                </span>
              )}
            </button>
            <button type="button" className="ej-toggle-btn" aria-label="Show reaction options" onClick={() => setExpanded(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </>
        )}

        <div className={`ej-expand-wrap${expanded ? " is-open" : ""}`} style={{ gridTemplateColumns: expanded ? "1fr" : "0fr" }}>
          <div className="ej-expand-inner">
            <button type="button" className="ej-toggle-btn" aria-label="Hide reaction options" onClick={() => setExpanded(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>

            {REACTIONS.map((reaction) => {
              const isSelected = lastReaction?.type === reaction.type;
              const disabled = (isLocked && !isSelected) || isSaving;
              const count = reactions[reaction.type];
              return (
                <button
                  key={reaction.type}
                  type="button"
                  className={[
                    "ej-emoji-btn",
                    isSelected ? "is-selected" : "",
                    isLocked ? "is-locked" : "",
                    justReacted === reaction.type ? "is-pop" : "",
                  ].filter(Boolean).join(" ")}
                  style={{ background: `linear-gradient(135deg, ${reaction.from}, ${reaction.to})` }}
                  aria-label={`React ${reaction.label}${count ? `, ${count} reactions` : ""}`}
                  aria-pressed={isSelected}
                  disabled={disabled}
                  tabIndex={expanded ? 0 : -1}
                  onClick={() => handleReact(reaction.type)}
                >
                  {reaction.emoji}
                  <span className="ej-tooltip" role="tooltip">{reaction.tooltip}</span>
                  {count > 0 && <span className="ej-count-dot" aria-hidden="true">{count > 99 ? "99+" : count}</span>}
                </button>
              );
            })}

            <div className="ej-divider" aria-hidden="true" />
            <span className="ej-total-chip">{loading ? "…" : `${total} react${total === 1 ? "" : "s"}`}</span>
            {isLocked && <span className="ej-cooldown-chip">Next in {formatRemaining(cooldownRemaining)}</span>}

            <button type="button" className="ej-close-btn" aria-label="Hide reaction bar" onClick={() => setIsDismissed(true)}>
              ×
            </button>
          </div>
        </div>
      </div>

      {error && <p className="ej-error" role="alert">{error}</p>}
    </div>
  );
}