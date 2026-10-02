
// News.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import theme from '../theme';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ---------- Fetch once and cache (starts as soon as this file is imported) ---------- */
let newsPromise = null;
const fetchNews = () => {
  if (!newsPromise) {
    newsPromise = fetch(`${API_URL}/api/news`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        // lowest position on top
        return [...list].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      })
      .catch((err) => {
        console.error('Failed to load news:', err);
        newsPromise = null; // allow retry on next visit
        return [];
      });
  }
  return newsPromise;
};
fetchNews();

/* ---------- Text markers ----------
   **word**  -> bold
   !!word!!  -> italic (tilted)
   ##word##  -> underline
   Markers can be mixed and nested: **bold !!and italic!!**
   A marker without a closing pair is shown as normal text. */
const MARKERS = {
  '**': { fontWeight: 700 },
  '!!': { fontStyle: 'italic' },
  '##': { textDecoration: 'underline', textUnderlineOffset: '3px' },
};

const renderRich = (text) => {
  if (text === null || text === undefined) return text;
  const parse = (str, keyPrefix) => {
    const out = [];
    let i = 0;
    let buf = '';
    let k = 0;
    while (i < str.length) {
      const mark = str.slice(i, i + 2);
      if (MARKERS[mark]) {
        const end = str.indexOf(mark, i + 2);
        if (end !== -1) {
          if (buf) {
            out.push(buf);
            buf = '';
          }
          const key = `${keyPrefix}-${k++}`;
          out.push(
            <span key={key} style={MARKERS[mark]}>
              {parse(str.slice(i + 2, end), key)}
            </span>
          );
          i = end + 2;
          continue;
        }
      }
      buf += str[i];
      i++;
    }
    if (buf) out.push(buf);
    return out;
  };
  return parse(String(text), 'r');
};

// plain text version (for the small label above, which is plain uppercase text)
const stripMarks = (text) => String(text || '').replace(/\*\*|!!|##/g, '');

/* ---------- Icons ---------- */
// Note / document icon (used when is_active = false)
const NoteIcon = () => (
  <svg width="16" height="18" viewBox="0 0 16 18" fill="none" stroke={theme.colors.accent} strokeWidth="1.5" strokeLinejoin="round">
    <path d="M2 1.5h7l5 5v10H2z" />
    <path d="M9 1.5v5h5" />
  </svg>
);

// Small glowing red dot (used when is_active = true)
const GlowDot = () => (
  <span
    className="glow-dot inline-block rounded-full"
    style={{ width: 10, height: 10, backgroundColor: theme.colors.accent }}
  />
);

/* ---------- Date helper ---------- */
// Supabase returns DATE as "YYYY-MM-DD". Parse manually to avoid timezone shifts.
const formatDate = (raw) => {
  if (!raw) return '';
  const [y, m, d] = String(raw).slice(0, 10).split('-').map(Number);
  if (!y || !m) return '';
  const date = new Date(y, m - 1, d || 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

/* ---------- Link logic (web link or email) ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getLinkInfo = (raw = '') => {
  const link = (raw || '').trim();
  if (!link) return null;

  // email (plain or already mailto:, with optional ?subject=...)
  const plain = link.replace(/^mailto:/i, '');
  if (EMAIL_RE.test(plain.split('?')[0])) {
    return { href: `mailto:${plain}`, text: 'Get in touch', arrow: '→', external: false };
  }

  // normal web link
  const href = /^(https?:\/\/|#|\/)/i.test(link) ? link : `https://${link}`;
  const external = /^https?:\/\//i.test(href);
  return { href, text: 'Read more', arrow: external ? '↗' : '→', external };
};

/* ---------- Reveal on scroll (works even if the element mounts late) ---------- */
const useInView = (threshold = 0.15) => {
  const [visible, setVisible] = useState(false);
  const observerRef = useRef(null);

  const ref = useCallback(
    (node) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node) return;

      if (typeof IntersectionObserver === 'undefined') {
        setVisible(true);
        return;
      }

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observerRef.current?.disconnect();
          }
        },
        { threshold }
      );
      observerRef.current.observe(node);
    },
    [threshold]
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [ref, visible];
};

/* ---------- Skeleton card (lazy loader): same shape as a real card ---------- */
const SkeletonItem = ({ index }) => (
  <div
    className="news-item news-skeleton grid grid-cols-1 lg:grid-cols-[260px_1fr_auto] gap-4 lg:gap-8 items-center box-border"
    style={{
      backgroundColor: theme.colors.newsBg,
      border: `1px solid ${theme.colors.newsBorder}`,
      borderRadius: '20px',
      padding: '28px 32px',
      animationDelay: `${index * 120}ms`,
    }}
    aria-hidden="true"
  >
    <div className="flex items-center gap-3">
      <span className="skeleton rounded-full" style={{ width: 12, height: 12 }} />
      <span className="skeleton" style={{ width: 110, height: 12 }} />
    </div>
    <div className="flex flex-col gap-2">
      <span className="skeleton" style={{ width: '90%', height: 14 }} />
      <span className="skeleton" style={{ width: '65%', height: 14 }} />
    </div>
    <span className="skeleton" style={{ width: 90, height: 12 }} />
  </div>
);

/* ---------- One news card (each card fades in when IT scrolls into view) ---------- */
const NewsItem = ({ item }) => {
  const [ref, shown] = useInView(0.1);
  const linkInfo = getLinkInfo(item.link);
  const dateText = formatDate(item.date);

  // active => glowing dot, inactive => note icon
  // label = "TYPE · DATE" (either part is skipped if empty)
  const labelText =
    [stripMarks(item.type), dateText].filter(Boolean).join(' · ') ||
    (item.is_active ? 'Now' : 'Update');

  return (
    <div
      ref={ref}
      className="news-item grid grid-cols-1 lg:grid-cols-[260px_1fr_auto] gap-4 lg:gap-8 items-center box-border"
      style={{
        backgroundColor: theme.colors.newsBg,
        border: `1px solid ${theme.colors.newsBorder}`,
        borderRadius: '20px',
        padding: '28px 32px',
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(30px)',
        filter: shown ? 'blur(0)' : 'blur(6px)',
        transition:
          'opacity 700ms ease, transform 700ms cubic-bezier(.2,.8,.2,1), filter 700ms ease, box-shadow 300ms ease, border-color 300ms ease',
      }}
    >
      {/* Label */}
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center" style={{ width: 16, height: 18 }}>
          {item.is_active ? <GlowDot /> : <NoteIcon />}
        </span>
        <span
          className="uppercase"
          style={{
            fontFamily: theme.fonts.main,
            fontSize: '0.8rem',
            letterSpacing: '0.15em',
            color: theme.colors.accent,
          }}
        >
          {labelText}
        </span>
      </div>

      {/* Text */}
      <p
        className="m-0"
        style={{
          fontFamily: theme.fonts.body,
          fontSize: '1.05rem',
          lineHeight: 1.65,
          color: theme.colors.heading,
        }}
      >
        <strong style={{ fontWeight: 700 }}>{renderRich(item.title)}</strong> {renderRich(item.description)}
      </p>

      {/* Link */}
      {linkInfo && (
        <a
          href={linkInfo.href}
          {...(linkInfo.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="news-cta uppercase no-underline inline-flex items-center gap-2 lg:justify-end"
          style={{
            fontFamily: theme.fonts.main,
            fontSize: '0.8rem',
            letterSpacing: '0.15em',
            color: theme.colors.accent,
          }}
        >
          {linkInfo.text}
          <span className="news-arrow">{linkInfo.arrow}</span>
        </a>
      )}
    </div>
  );
};

/* ---------- Section ---------- */
const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ref, visible] = useInView();

  useEffect(() => {
    let alive = true;
    fetchNews().then((list) => {
      if (!alive) return;
      setNews(list);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // nothing to show once loading is done
  if (!loading && news.length === 0) return null;

  return (
    <section ref={ref} className="w-full box-border px-6 sm:px-12 pt-4 pb-4">
      <style>{`
        /* border only appears when hovering the card */
        .news-item:hover {
          box-shadow: 0 10px 28px rgba(154, 33, 57, 0.15);
          border-color: ${theme.colors.newsBorderStrong} !important;
        }
        .news-skeleton:hover { box-shadow: none; border-color: ${theme.colors.newsBorder} !important; }
        .news-arrow { display: inline-block; transition: transform 300ms ease; }
        .news-cta:hover .news-arrow { transform: translateX(6px); }

        /* underline that draws in from the left on hover */
        .news-cta { position: relative; padding-bottom: 4px; }
        .news-cta::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          height: 1px;
          background-color: currentColor;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 350ms cubic-bezier(.2,.8,.2,1);
        }
        .news-cta:hover::after { transform: scaleX(1); }

        .news-line { transform-origin: left; transform: scaleX(0); transition: transform 900ms cubic-bezier(.2,.8,.2,1) 300ms; }
        .news-in-view .news-line { transform: scaleX(1); }

        /* soft glowing pulse for the active dot */
        .glow-dot { animation: glowPulse 2s ease-in-out infinite; }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 3px 1px rgba(185, 46, 72, 0.35); }
          50%      { box-shadow: 0 0 9px 3px rgba(185, 46, 72, 0.6); }
        }

        /* lazy loader: skeleton cards appear right away, with a shimmer */
        .news-skeleton { opacity: 0; animation: skeletonIn 500ms ease forwards; }
        @keyframes skeletonIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

        .skeleton {
          display: block;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(154,33,57,0.08) 25%, rgba(154,33,57,0.18) 50%, rgba(154,33,57,0.08) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .glow-dot { animation: none; box-shadow: 0 0 6px 2px rgba(185,46,72,0.45); }
          .skeleton { animation: none; }
          .news-skeleton { animation: none; opacity: 1; }
        }
      `}</style>

      <div className={`mx-auto max-w-6xl ${visible ? 'news-in-view' : ''}`}>
        {/* Heading */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 700ms ease, transform 700ms ease',
          }}
        >
          <p
            className="uppercase m-0 mb-2"
            style={{
              fontFamily: theme.fonts.main,
              color: theme.colors.accent,
              fontSize: '0.85rem',
              letterSpacing: '0.25em',
            }}
          >
            Latest
          </p>

          <h2
            className="inline-block m-0 relative pb-1 text-4xl sm:text-5xl"
            style={{
              fontFamily: theme.fonts.heading,
              fontWeight: 400,
              color: theme.colors.heading,
            }}
          >
            News
            <span
              className="news-line absolute left-0 bottom-0 w-full"
              style={{ height: '3px', backgroundColor: theme.colors.accent }}
            />
          </h2>
        </div>

        {/* Items */}
        <div className="flex flex-col gap-5 mt-10" aria-busy={loading}>
          {loading
            ? [0, 1, 2].map((i) => <SkeletonItem key={`sk-${i}`} index={i} />)
            : news.map((item) => <NewsItem key={item.id} item={item} />)}
        </div>
      </div>
    </section>
  );
};

export default News;