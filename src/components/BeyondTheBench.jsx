// BeyondTheBench.jsx - collapsible categories -> project cards -> big popup
import React, { useCallback, useEffect, useRef, useState } from 'react';
import theme from '../theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ---------- Fetch once and cache (starts as soon as this file is imported) ---------- */
let btbPromise = null;
const fetchCategories = () => {
  if (!btbPromise) {
    btbPromise = fetch(`${API_URL}/api/beyond-the-bench`)
      .then((res) => {
        if (!res.ok) throw new Error('backend not reachable');
        return res.json();
      })
      .then((data) => (Array.isArray(data?.categories) ? data.categories : []))
      .catch((err) => {
        btbPromise = null; // allow retry on next visit
        throw err;
      });
  }
  return btbPromise;
};
fetchCategories().catch(() => {}); // the page shows the error itself

/* ---------- Helpers ---------- */
const toUrl = (value = '') => {
  const v = (value || '').trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Waits until the given images are downloaded (or failed), but never longer than timeoutMs
const preloadImages = (urls, timeoutMs = 3000) =>
  Promise.race([
    Promise.all(
      urls.map(
        (url) =>
          new Promise((resolve) => {
            const img = new Image();
            img.referrerPolicy = 'no-referrer';
            img.onload = resolve;
            img.onerror = resolve;
            img.src = url;
          })
      )
    ),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);

/* ---------- Text formatting ----------
   **words** -> bold     !!words!! -> italic (tilted)     ##words## -> underlined
   They can be mixed or nested, e.g.  **##bold and underlined##**
   A marker with no closing partner (like "Wow!!") is shown as normal text.
   Spaces and line breaks are kept exactly as written. */
const MARKS = { '**': 'bold', '!!': 'italic', '##': 'underline' };

// Turns a text into a list of segments: { text, bold, italic, underline }
const parseFormatting = (text = '') => {
  const parts = String(text).split(/(\*\*|!!|##)/);
  const flags = { bold: false, italic: false, underline: false };
  const segments = [];

  parts.forEach((part, idx) => {
    const key = MARKS[part];
    if (key) {
      if (flags[key]) {
        flags[key] = false; // closing marker
        return;
      }
      if (parts.slice(idx + 1).includes(part)) {
        flags[key] = true; // opening marker (only if a closing one exists later)
        return;
      }
      // no closing marker: fall through and show it as normal text
    }
    if (part) segments.push({ text: part, ...flags });
  });

  return segments;
};

const Formatted = ({ text }) =>
  parseFormatting(text).map((s, i) => (
    <span
      key={i}
      style={{
        fontWeight: s.bold ? 700 : undefined,
        color: s.bold ? theme.colors.heading : undefined,
        fontStyle: s.italic ? 'italic' : undefined,
        textDecoration: s.underline ? 'underline' : undefined,
        textUnderlineOffset: s.underline ? '4px' : undefined,
      }}
    >
      {s.text}
    </span>
  ));

// Heading: every letter rises in one after another
const Letters = ({ text, start = 0 }) => {
  let n = 0;
  return (
    <span aria-label={text}>
      {text.split(' ').map((word, w) => (
        <React.Fragment key={w}>
          {w > 0 && ' '}
          <span aria-hidden="true" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {[...word].map((ch, c) => (
              <span key={c} className="btb-letter" style={{ animationDelay: `${start + (n++) * 40}ms` }}>
                {ch}
              </span>
            ))}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};

const Chevron = ({ open }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 250ms ease' }}
  >
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------- One project card (click anywhere -> popup) ---------- */
const ProjectCard = ({ item, onOpen }) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [shown, setShown] = useState(false);
  const cardRef = useRef(null);
  const imgRef = useRef(null);

  // fade in once when the card scrolls into view
  useEffect(() => {
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // image may already be cached before React attached onLoad
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  const imageUrl = (item.image_url || '').trim();
  const linkedin = toUrl(item.linkedin_url);
  const date = formatDate(item.date);

  return (
    <article
      ref={cardRef}
      onClick={() => onOpen(item)}
      className={`btb-card btb-reveal overflow-hidden flex flex-col cursor-pointer${shown ? ' in' : ''}`}
      style={{
        backgroundColor: '#fff',
        border: `1px solid ${theme.colors.newsBorder}`,
        borderRadius: '20px',
      }}
    >
      {imageUrl && !failed && (
        <div
          className={loaded ? 'btb-imgbox' : 'btb-imgbox btb-shimmer'}
          style={{ backgroundColor: theme.colors.newsBg }}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt={item.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className="btb-img"
            style={{ opacity: loaded ? 1 : 0 }}
          />
        </div>
      )}

      <div
        className="flex-1"
        style={{ borderLeft: `3px solid ${theme.colors.accent}`, padding: '24px 28px' }}
      >
        {date && (
          <p
            className="uppercase m-0 mb-2"
            style={{
              fontFamily: theme.fonts.main,
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              color: theme.colors.body,
            }}
          >
            {date}
          </p>
        )}

        <h3
          className="m-0 mb-3"
          style={{
            fontFamily: theme.fonts.heading,
            fontWeight: 400,
            fontSize: '1.5rem',
            lineHeight: 1.25,
            color: theme.colors.heading,
          }}
        >
          <Formatted text={item.name} />
        </h3>

        {/* only the first 3 lines, then "..." */}
        <p
          className="btb-clamp m-0"
          style={{
            fontFamily: theme.fonts.body,
            fontSize: '1rem',
            lineHeight: 1.7,
            color: theme.colors.body,
            whiteSpace: 'pre-line',
          }}
        >
          <Formatted text={item.description} />
        </p>
      </div>

      <div className="flex flex-wrap" style={{ borderTop: `1px solid ${theme.colors.newsBorder}` }}>
        <button
          type="button"
          className="btb-foot btb-readmore uppercase"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(item);
          }}
          style={{ borderRight: linkedin ? `1px solid ${theme.colors.newsBorder}` : 'none' }}
        >
          <span className="btb-ul">Read more</span>
        </button>

        {linkedin && (
          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="btb-foot btb-read uppercase"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="btb-ul">
              Read more on LinkedIn <span>↗</span>
            </span>
          </a>
        )}
      </div>
    </article>
  );
};

/* ---------- Big popup: heading + date + full description ---------- */
const ProjectModal = ({ item, onClose }) => {
  const closeRef = useRef(null);
  const panelRef = useRef(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement;
    document.body.style.overflow = 'hidden'; // page behind can't scroll
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // keep Tab inside the popup
      if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll('a[href], button');
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [onClose]);

  const imageUrl = (item.image_url || '').trim();
  const linkedin = toUrl(item.linkedin_url);
  const date = formatDate(item.date);

  return (
    <div
      className="btb-overlay"
      // click on the dark area (outside the popup) closes it
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="btb-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="btb-modal-title"
        style={{ backgroundColor: '#fff' }}
      >
        {/* stays pinned in the corner while the content scrolls */}
        <button
          ref={closeRef}
          type="button"
          aria-label="Close"
          className="btb-close"
          onClick={onClose}
          style={{ color: theme.colors.heading, border: `1px solid ${theme.colors.newsBorder}` }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>

        <div className="btb-scroll">
          {imageUrl && !imgFailed && (
            <div className="btb-modal-img" style={{ backgroundColor: theme.colors.newsBg }}>
              <img
                src={imageUrl}
                alt={item.name}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="btb-img"
              />
            </div>
          )}

          <div
            style={{
              borderLeft: `3px solid ${theme.colors.accent}`,
              margin: 'clamp(20px, 4vw, 40px)',
              padding: '4px 0 4px clamp(16px, 3vw, 32px)',
            }}
          >
            {date && (
              <p
                className="uppercase m-0 mb-3"
                style={{
                  fontFamily: theme.fonts.main,
                  fontSize: '0.78rem',
                  letterSpacing: '0.2em',
                  color: theme.colors.accent,
                }}
              >
                {date}
              </p>
            )}

            <h3
              id="btb-modal-title"
              className="m-0 mb-5"
              style={{
                fontFamily: theme.fonts.heading,
                fontWeight: 400,
                fontSize: 'clamp(1.6rem, 4vw, 2.6rem)',
                lineHeight: 1.2,
                color: theme.colors.heading,
              }}
            >
              <Formatted text={item.name} />
            </h3>

            <p
              className="m-0"
              style={{
                fontFamily: theme.fonts.body,
                fontSize: 'clamp(1rem, 1.6vw, 1.15rem)',
                lineHeight: 1.8,
                color: theme.colors.body,
                whiteSpace: 'pre-line',
              }}
            >
              <Formatted text={item.description} />
            </p>
          </div>
        </div>

        {linkedin && (
          <div style={{ borderTop: `1px solid ${theme.colors.newsBorder}` }}>
            <a
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="btb-foot btb-read uppercase"
              style={{ display: 'block', width: '100%', boxSizing: 'border-box' }}
            >
              <span className="btb-ul">
                Read more on LinkedIn <span>↗</span>
              </span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Lazy loader for the projects inside a category ---------- */
const ProjectSkeleton = ({ index }) => (
  <div
    className="btb-skel-in overflow-hidden flex flex-col"
    aria-hidden="true"
    style={{
      backgroundColor: '#fff',
      border: `1px solid ${theme.colors.newsBorder}`,
      borderRadius: '20px',
      animationDelay: `${index * 120}ms`,
    }}
  >
    <span className="btb-skel" style={{ width: '100%', height: 220, borderRadius: 0 }} />
    <div style={{ borderLeft: `3px solid ${theme.colors.accent}`, padding: '24px 28px' }}>
      <span className="btb-skel" style={{ width: 90, height: 12 }} />
      <span className="btb-skel" style={{ width: '75%', height: 22, marginTop: 14 }} />
      <span className="btb-skel" style={{ width: '95%', height: 12, marginTop: 16 }} />
      <span className="btb-skel" style={{ width: '90%', height: 12, marginTop: 8 }} />
      <span className="btb-skel" style={{ width: '60%', height: 12, marginTop: 8 }} />
    </div>
    <div style={{ borderTop: `1px solid ${theme.colors.newsBorder}`, padding: '16px 20px' }}>
      <span className="btb-skel" style={{ width: 90, height: 12, margin: '0 auto' }} />
    </div>
  </div>
);

/* ---------- Collapsible category ---------- */
const CategorySection = ({ category, onOpen }) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // cards are built only after the first open
  const [ready, setReady] = useState(false); // this category's projects finished loading
  const panelRef = useRef(null);

  const projects = category.projects || [];
  const count = projects.length;
  const panelId = `btb-panel-${category.id}`;
  const buttonId = `btb-cat-${category.id}`;

  // first open only: show skeleton cards until THIS category's images are downloaded
  useEffect(() => {
    if (!mounted) return undefined;
    let alive = true;
    const urls = (category.projects || []).map((p) => (p.image_url || '').trim()).filter(Boolean);
    Promise.all([preloadImages(urls), new Promise((r) => setTimeout(r, 350))]).then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [mounted, category]);

  // collapsed content must not be reachable with the keyboard
  useEffect(() => {
    panelRef.current?.toggleAttribute('inert', !open);
  }, [open]);

  const toggle = () => {
    if (!open) setMounted(true);
    setOpen((o) => !o);
  };

  return (
    <div
      className="overflow-hidden"
      style={{
        backgroundColor: '#fff',
        border: `1px solid ${open ? theme.colors.newsBorderStrong : theme.colors.newsBorder}`,
        borderRadius: '16px',
        transition: 'border-color 250ms ease',
      }}
    >
      <h2 className="m-0">
        <button
          id={buttonId}
          type="button"
          className="btb-cat-btn"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={panelId}
          style={{ backgroundColor: open ? theme.colors.newsBg : 'transparent' }}
        >
          <span className="flex-1 min-w-0">
            <span
              className="block"
              style={{
                fontFamily: theme.fonts.heading,
                fontWeight: 400,
                fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                lineHeight: 1.2,
                color: theme.colors.accent,
              }}
            >
              {category.label}
            </span>
            <span
              className="block uppercase mt-1"
              style={{
                fontFamily: theme.fonts.main,
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                color: theme.colors.body,
              }}
            >
              {count} {count === 1 ? 'project' : 'projects'}
            </span>
          </span>

          <span
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '999px',
              backgroundColor: open ? theme.colors.accent : theme.colors.newsBg,
              color: open ? '#fff' : theme.colors.accent,
              transition: 'background-color 250ms ease, color 250ms ease',
            }}
          >
            <Chevron open={open} />
          </span>
        </button>
      </h2>

      {/* smooth open/close: grid row goes 0fr -> 1fr */}
      <div
        id={panelId}
        ref={panelRef}
        role="region"
        aria-labelledby={buttonId}
        className="btb-collapse"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          <div style={{ padding: 'clamp(16px, 3vw, 28px)', borderTop: `1px solid ${theme.colors.newsBorder}` }}>
            {mounted &&
              (count > 0 ? (
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3" aria-busy={!ready}>
                  {ready
                    ? projects.map((item) => <ProjectCard key={item.id} item={item} onOpen={onOpen} />)
                    : Array.from({ length: Math.min(count, 3) }, (_, i) => <ProjectSkeleton key={i} index={i} />)}
                </div>
              ) : (
                <p className="m-0" style={{ fontFamily: theme.fonts.body, color: theme.colors.body }}>
                  Nothing here yet.
                </p>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Lazy loader: skeleton shaped like a category row ---------- */
const CategorySkeleton = ({ index }) => (
  <div
    className="btb-skel-in flex items-center gap-4"
    aria-hidden="true"
    style={{
      backgroundColor: '#fff',
      border: `1px solid ${theme.colors.newsBorder}`,
      borderRadius: '16px',
      padding: 'clamp(16px, 2.5vw, 24px) clamp(18px, 3vw, 28px)',
      animationDelay: `${index * 120}ms`,
    }}
  >
    <div className="flex-1 min-w-0">
      <span className="btb-skel" style={{ width: 'min(240px, 70%)', height: 24 }} />
      <span className="btb-skel" style={{ width: 80, height: 12, marginTop: 10 }} />
    </div>
    <span className="btb-skel flex-shrink-0" style={{ width: 36, height: 36, borderRadius: 999 }} />
  </div>
);

/* ---------- Page ---------- */
const BeyondTheBench = () => {
  const [categories, setCategories] = useState(null); // null = still loading
  const [error, setError] = useState(false);
  const [active, setActive] = useState(null); // project shown in the popup

  const closeModal = useCallback(() => setActive(null), []);

  useEffect(() => {
    let alive = true;
    fetchCategories()
      .then((list) => {
        if (alive) setCategories(list);
      })
      .catch((err) => {
        console.error('Failed to load Beyond the Bench:', err);
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const muted = { fontFamily: theme.fonts.body, fontSize: '1.1rem', color: theme.colors.body };

  return (
    <section className="w-full box-border px-6 sm:px-12 pt-16 pb-20">
      <style>{`
        .btb-card:hover { box-shadow: 0 8px 22px rgba(0,0,0,0.06); }

        .btb-reveal { opacity: 0; transform: translateY(14px); transition: opacity 450ms ease, transform 450ms ease, box-shadow 200ms ease; }
        .btb-reveal.in { opacity: 1; transform: none; }

        .btb-imgbox { width: 100%; height: 220px; overflow: hidden; }
        .btb-img { display: block; width: 100%; height: 100%; object-fit: cover; transition: opacity 400ms ease; }

        /* description: first 3 lines, then "..." */
        .btb-clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

        /* lazy loader: shimmer bars + shimmer while an image loads */
        @keyframes btb-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .btb-skel, .btb-shimmer {
          background-image: linear-gradient(90deg, rgba(154,33,57,0.08) 25%, rgba(154,33,57,0.18) 50%, rgba(154,33,57,0.08) 75%);
          background-size: 200% 100%;
          animation: btb-shimmer 1.4s ease-in-out infinite;
        }
        .btb-skel { display: block; border-radius: 6px; background-color: ${theme.colors.newsBg}; }

        /* skeleton rows appear right away */
        @keyframes btb-skel-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .btb-skel-in { opacity: 0; animation: btb-skel-in 500ms ease forwards; }

        @keyframes btb-rise {
          from { opacity: 0; transform: translateY(0.45em); }
          to   { opacity: 1; transform: none; }
        }
        .btb-label  { opacity: 0; animation: btb-rise 600ms ease-out forwards; }
        .btb-letter { display: inline-block; opacity: 0; animation: btb-rise 550ms cubic-bezier(.2,.8,.2,1) forwards; }

        /* category open / close */
        .btb-collapse { display: grid; transition: grid-template-rows 350ms ease; }
        .btb-cat-btn {
          width: 100%; display: flex; align-items: center; gap: 16px; text-align: left;
          padding: clamp(16px, 2.5vw, 24px) clamp(18px, 3vw, 28px);
          border: 0; cursor: pointer; transition: background-color 200ms ease;
        }
        .btb-cat-btn:hover { background-color: ${theme.colors.newsBg} !important; }
        .btb-cat-btn:focus-visible, .btb-foot:focus-visible, .btb-close:focus-visible {
          outline: 2px solid ${theme.colors.accent}; outline-offset: -2px;
        }

        /* footer buttons on each card */
        .btb-foot {
          flex: 1 1 auto; text-align: center; text-decoration: none; cursor: pointer;
          font-family: ${theme.fonts.main}; font-size: 0.75rem; letter-spacing: 0.15em;
          padding: 16px 20px; border: 0;
        }
        .btb-readmore { color: ${theme.colors.accent}; background-color: #fff; }
        .btb-readmore:hover { background-color: ${theme.colors.newsBg}; }
        .btb-read { color: #fff; background-color: ${theme.colors.accent}; }
        .btb-read:hover { filter: brightness(1.12); }

        .btb-ul { position: relative; display: inline-block; padding-bottom: 4px; }
        .btb-ul::after {
          content: ''; position: absolute; left: 0; bottom: 0; width: 100%; height: 1.5px;
          background: currentColor; transform: scaleX(0); transition: transform 200ms ease;
        }
        .btb-foot:hover .btb-ul::after, .btb-foot:focus-visible .btb-ul::after { transform: scaleX(1); }

        /* popup: dark + blurred page behind, big panel, scrolls inside */
        @keyframes btb-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes btb-pop  { from { opacity: 0; transform: translateY(16px) scale(0.96); } to { opacity: 1; transform: none; } }
        .btb-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: clamp(10px, 3vw, 32px);
          background-color: rgba(35, 31, 32, 0.62);
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
          animation: btb-fade 200ms ease-out;
        }
        .btb-panel {
          position: relative; display: flex; flex-direction: column;
          width: 100%; max-width: 1100px;
          max-height: 92vh; max-height: 92dvh;
          border-radius: 20px; overflow: hidden;
          box-shadow: 0 30px 80px rgba(0,0,0,0.35);
          animation: btb-pop 280ms cubic-bezier(.2,.8,.2,1);
        }
        .btb-scroll { flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; }
        .btb-modal-img { width: 100%; height: clamp(200px, 38vh, 420px); overflow: hidden; }
        .btb-close {
          position: absolute; top: 14px; right: 14px; z-index: 5;
          width: 42px; height: 42px; border-radius: 999px; background-color: #fff;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          box-shadow: 0 4px 14px rgba(0,0,0,0.18); transition: background-color 200ms ease, color 200ms ease;
        }
        .btb-close:hover { background-color: ${theme.colors.accent}; color: #fff !important; }

        @media (prefers-reduced-motion: reduce) {
          .btb-reveal { opacity: 1; transform: none; transition: none; }
          .btb-skel, .btb-shimmer, .btb-overlay, .btb-panel { animation: none; }
          .btb-skel-in { animation: none; opacity: 1; }
          .btb-img, .btb-collapse { transition: none; }
          .btb-label, .btb-letter { animation: none; opacity: 1; }
        }
      `}</style>

      <div className="mx-auto max-w-6xl">
        <p
          className="btb-label uppercase m-0 mb-2"
          style={{
            fontFamily: theme.fonts.main,
            color: theme.colors.accent,
            fontSize: '0.85rem',
            letterSpacing: '0.25em',
          }}
        >
          Beyond the Bench
        </p>
        <h1
          className="m-0 text-4xl sm:text-5xl"
          style={{ fontFamily: theme.fonts.heading, fontWeight: 400, color: theme.colors.heading }}
        >
          <Letters text="Life outside the lab" start={60} />
        </h1>

        <div className="mt-12">
          {error && (
            <p className="m-0" style={muted}>
              Couldn't load projects right now — please check back shortly.
            </p>
          )}

          {!error && categories === null && (
            <div className="flex flex-col gap-5" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <CategorySkeleton key={i} index={i} />
              ))}
            </div>
          )}

          {!error && categories && categories.length === 0 && (
            <p className="m-0" style={muted}>
              Currently there is no Beyond the Bench work. We will update it soon.
            </p>
          )}

          {!error && categories && categories.length > 0 && (
            <>
              <p
                className="uppercase m-0 mb-6"
                style={{
                  fontFamily: theme.fonts.main,
                  fontSize: '0.75rem',
                  letterSpacing: '0.15em',
                  color: theme.colors.body,
                }}
              >
                Click a category to see its projects
              </p>
              <div className="flex flex-col gap-5">
                {categories.map((category) => (
                  <CategorySection key={category.id} category={category} onOpen={setActive} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {active && <ProjectModal key={active.id} item={active} onClose={closeModal} />}
    </section>
  );
};

export default BeyondTheBench;