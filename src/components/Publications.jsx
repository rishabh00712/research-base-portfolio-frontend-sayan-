// Publications.jsx - the whole Publications page in one file (no other local imports except theme)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import theme from '../theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ---------- Fetch once and cache ---------- */
const EMPTY = { google_scholar: '', orcid: '', publications: [] };

let publicationsPromise = null;
const fetchPublications = () => {
  if (!publicationsPromise) {
    publicationsPromise = fetch(`${API_URL}/api/publications`)
      .then((res) => res.json())
      .then((data) => ({
        google_scholar: data?.google_scholar || '',
        orcid: data?.orcid || '',
        publications: Array.isArray(data?.publications) ? data.publications : [],
      }))
      .catch((err) => {
        console.error('Failed to load publications:', err);
        publicationsPromise = null;
        return EMPTY;
      });
  }
  return publicationsPromise;
};
fetchPublications();

/* ---------- Small helpers ---------- */
const toUrl = (value = '') => {
  const v = (value || '').trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

/* Image address can be: full https link, Google Drive share link,
   /path on your backend, or a bare path like uploads/abstract.png */
const toImageUrl = (value = '') => {
  const v = (value || '').trim();
  if (!v) return '';

  const drive = v.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w1600`;

  if (/^(https?:)?\/\//i.test(v) || v.startsWith('data:')) return v;
  if (v.startsWith('/')) return `${API_URL}${v}`;
  if (/^[\w-]+(\.[\w-]+)+\//.test(v)) return `https://${v}`; // looks like domain.com/...
  return `${API_URL}/${v}`;
};

const getOrcidId = (orcid = '') => (orcid.match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/) || [])[0] || '';
const toOrcidUrl = (orcid = '') => {
  const o = (orcid || '').trim();
  if (!o) return '';
  return /^https?:\/\//i.test(o) ? o : `https://orcid.org/${o}`;
};

/* ---------- Load animation helper (plays once when the page heading appears) ---------- */
// Title: every letter rises in one after another
const Letters = ({ text, start = 0 }) => {
  let n = 0;
  return (
    <span aria-label={text}>
      {text.split(' ').map((word, w) => (
        <React.Fragment key={w}>
          {w > 0 && ' '}
          <span aria-hidden="true" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {[...word].map((ch, c) => (
              <span key={c} className="pb-letter" style={{ animationDelay: `${start + (n++) * 40}ms` }}>
                {ch}
              </span>
            ))}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};

/* Description supports light formatting (can be mixed or nested):
   **words**  -> bold (e.g. your own name)
   !!words!!  -> tilted / italic (e.g. journal name)
   ##words##  -> underlined
   *words*    -> italic (older single-star style, still works)
   e.g.  **##bold and underlined##**
   A marker with no closing partner (like "Wow!!") is shown as normal text.
   a DOI like 10.1016/j.snr.2026.100495 is replaced by the word "link".
   The word points to the `link` column from the backend
   (if that column is empty it falls back to https://doi.org/<doi>) */
const UNDERLINE = { textDecoration: 'underline', textUnderlineOffset: '4px' };

const TOKEN_RE = /(\*\*[\s\S]+?\*\*|!![\s\S]+?!!|##[\s\S]+?##|\*[^*]+\*)/g;
const renderDescription = (text = '', prefix = 'd') => {
  const nodes = [];
  const re = new RegExp(TOKEN_RE.source, 'g');
  let last = 0;
  let key = 0;
  let m;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    const k = `${prefix}-${key++}`;

    if (token.startsWith('**')) {
      nodes.push(
        <strong key={k} style={{ fontWeight: 600, color: theme.colors.heading }}>
          {renderDescription(token.slice(2, -2), k)}
        </strong>
      );
    } else if (token.startsWith('!!')) {
      nodes.push(
        <em key={k} style={{ fontStyle: 'italic' }}>
          {renderDescription(token.slice(2, -2), k)}
        </em>
      );
    } else if (token.startsWith('##')) {
      nodes.push(
        <span key={k} style={UNDERLINE}>
          {renderDescription(token.slice(2, -2), k)}
        </span>
      );
        } else if (token.startsWith('*')) {
      nodes.push(
        <em key={k} style={{ color: theme.colors.body }}>
          {token.slice(1, -1)}
        </em>
      );
    }
    last = m.index + token.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
};

/* ---------- One publication = one full-width row ----------
   Order inside the card:
   1) image (if any)
   2) description (the DOI is shown as the word "link" -> `link` column)
   3) tags
   4) paper_link -> "Read paper" bar at the very end (if any)            */
const PublicationCard = ({ item }) => {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [shown, setShown] = useState(false);
  const cardRef = useRef(null);
  const imgRef = useRef(null);

  // simple reveal: card fades in once when it scrolls into view
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

  const imageUrl = toImageUrl(item.image);

  const readLink = toUrl(item.paper_link); // the "Read paper" button at the bottom
  const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];

  return (
    <article
      ref={cardRef}
      className={`pub-card pub-reveal overflow-hidden${shown ? ' in' : ''}`}
      style={{
        backgroundColor: '#fff',
        border: `1px solid ${theme.colors.newsBorder}`,
        borderRadius: '20px',
      }}
    >
      {imageUrl && !failed && (
        <div
          className={loaded ? 'pub-imgbox' : 'pub-imgbox pub-pulse'}
          style={{ backgroundColor: theme.colors.newsBg }}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Graphical abstract"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className="pub-img"
            style={{ opacity: loaded ? 1 : 0 }}
          />
        </div>
      )}

      <div style={{ borderLeft: `3px solid ${theme.colors.accent}`, padding: '28px 32px' }}>
        <p
          className="m-0"
          style={{
            fontFamily: theme.fonts.body,
            fontSize: '1.15rem',
            lineHeight: 1.7,
            color: theme.colors.heading,
          }}
        >
          {renderDescription(item.description)}
        </p>

        {tags.length > 0 && (
          <ul className="list-none m-0 mt-5 p-0 flex flex-wrap gap-2.5">
            {tags.map((tag) => (
              <li
                key={tag}
                className="uppercase"
                style={{
                  fontFamily: theme.fonts.main,
                  fontSize: '0.7rem',
                  letterSpacing: '0.15em',
                  color: theme.colors.accent,
                  backgroundColor: theme.colors.newsBg,
                  border: `1px solid ${theme.colors.newsBorder}`,
                  borderRadius: '999px',
                  padding: '6px 14px',
                }}
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      {readLink && (
        <div style={{ borderTop: `1px solid ${theme.colors.newsBorder}` }}>
          <a
            href={readLink}
            target="_blank"
            rel="noopener noreferrer"
            className="pub-read uppercase inline-block"
            style={{
              fontFamily: theme.fonts.main,
              fontSize: '0.8rem',
              letterSpacing: '0.15em',
              textDecoration: 'none',
              padding: '18px 28px',
            }}
          >
            <span className="pub-ul">
              Read paper <span className="pub-arrow">↗</span>
            </span>
          </a>
        </div>
      )}
    </article>
  );
};

/* ---------- Loading placeholder: pulsing card with an image block ---------- */
const PublicationSkeleton = () => (
  <div
    className="pub-pulse overflow-hidden"
    style={{
      backgroundColor: '#fff',
      border: `1px solid ${theme.colors.newsBorder}`,
      borderRadius: '20px',
    }}
    aria-hidden="true"
  >
    <div className="pub-imgbox" style={{ backgroundColor: theme.colors.newsBg }} />
    <div style={{ padding: '28px 32px' }}>
      <div style={{ width: '92%', height: '16px', borderRadius: '8px', backgroundColor: theme.colors.newsBg }} />
      <div style={{ width: '70%', height: '16px', borderRadius: '8px', backgroundColor: theme.colors.newsBg, marginTop: '12px' }} />
      <div style={{ width: '28%', height: '24px', borderRadius: '999px', backgroundColor: theme.colors.newsBg, marginTop: '20px' }} />
    </div>
  </div>
);

/* ---------- Page ---------- */
const Publications = () => {
  const [data, setData] = useState(null); // null = still loading

  useEffect(() => {
    let alive = true;
    fetchPublications().then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, []);

  // group by year, newest first (the backend already sorts by date)
  const groups = useMemo(() => {
    const out = [];
    (data?.publications || []).forEach((p) => {
      const last = out[out.length - 1];
      if (last && last.year === p.year) last.items.push(p);
      else out.push({ year: p.year, items: [p] });
    });
    return out;
  }, [data]);

  const scholarUrl = toUrl(data?.google_scholar);
  const orcidUrl = toOrcidUrl(data?.orcid);
  const orcidId = getOrcidId(data?.orcid);

  const linkStyle = {
    fontFamily: theme.fonts.main,
    color: theme.colors.accent,
    fontSize: '0.85rem',
    letterSpacing: '0.15em',
    textDecoration: 'none',
  };

  return (
    <section className="w-full box-border px-6 sm:px-12 pt-16 pb-20">
      <style>{`
        .pub-card:hover { box-shadow: 0 8px 22px rgba(0,0,0,0.06); }

        /* simple card fade-in (quick, small movement) */
        .pub-reveal { opacity: 0; transform: translateY(14px); transition: opacity 450ms ease, transform 450ms ease, box-shadow 200ms ease; }
        .pub-reveal.in { opacity: 1; transform: none; }

        /* image fills the whole top of the card: no gaps */
        .pub-imgbox { width: 100%; height: 320px; overflow: hidden; }
        @media (max-width: 640px) { .pub-imgbox { height: 220px; } }
        .pub-img { display: block; width: 100%; height: 100%; object-fit: cover; transition: opacity 400ms ease; }

        /* light pulse while the image is loading */
        @keyframes pub-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .pub-pulse { animation: pub-pulse 1.4s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .pub-reveal { opacity: 1; transform: none; transition: none; }
          .pub-pulse { animation: none; }
          .pub-img { transition: none; }
        }

        /* page-load animation for the heading block (plays once) */
        @keyframes pb-rise {
          from { opacity: 0; transform: translateY(0.45em); }
          to   { opacity: 1; transform: none; }
        }
        .pb-label  { opacity: 0; animation: pb-rise 600ms ease-out forwards; }
        .pb-letter { display: inline-block; opacity: 0; animation: pb-rise 550ms cubic-bezier(.2,.8,.2,1) forwards; }
        .pb-pop    { opacity: 0; animation: pb-rise 500ms ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .pb-label, .pb-letter, .pb-pop { animation: none; opacity: 1; }
        }

        /* underline on hover: Google Scholar, ORCID, Paper link, Read paper */
        .pub-link, .pub-ul { position: relative; display: inline-block; padding-bottom: 4px; }
        .pub-link::after, .pub-ul::after {
          content: '';
          position: absolute; left: 0; bottom: 0;
          width: 100%; height: 1.5px;
          background: currentColor;
          transform: scaleX(0);
          transition: transform 200ms ease;
        }
        .pub-link:hover::after, .pub-link:focus-visible::after,
        .pub-read:hover .pub-ul::after, .pub-read:focus-visible .pub-ul::after {
          transform: scaleX(1);
        }
        .pub-arrow { display: inline-block; }



        /* the "Read paper" bar at the end of a card */
        .pub-read { color: #fff; background-color: ${theme.colors.accent}; }
        .pub-read:hover { filter: brightness(1.12); }
      `}</style>

      <div className="mx-auto max-w-6xl">
        <p
          className="pb-label uppercase m-0 mb-2"
          style={{
            fontFamily: theme.fonts.main,
            color: theme.colors.accent,
            fontSize: '0.85rem',
            letterSpacing: '0.25em',
          }}
        >
          Publications
        </p>
        <h1
          className="m-0 text-4xl sm:text-5xl"
          style={{ fontFamily: theme.fonts.heading, fontWeight: 400, color: theme.colors.heading }}
        >
          <Letters text="Peer-reviewed work" start={60} />
        </h1>

        {/* Google Scholar and ORCID are fully independent: each shows only if its own value exists */}
        {(scholarUrl || orcidUrl) && (
          <div className="flex flex-wrap items-start gap-x-12 gap-y-4 mt-8">
            {scholarUrl && (
              <a href={scholarUrl} target="_blank" rel="noopener noreferrer" className="pb-pop pub-link uppercase" style={{ ...linkStyle, animationDelay: '150ms' }}>
                Google Scholar <span className="pub-arrow">↗</span>
              </a>
            )}

            {orcidUrl && (
              <a href={orcidUrl} target="_blank" rel="noopener noreferrer" className="pb-pop pub-link uppercase" style={{ ...linkStyle, animationDelay: '300ms' }}>
                ORCID
                {orcidId && (
                  <span style={{ color: theme.colors.body, letterSpacing: '0.05em', marginLeft: '0.7em' }}>{orcidId}</span>
                )}
                <span className="pub-arrow" style={{ marginLeft: '0.5em' }}>↗</span>
              </a>
            )}
          </div>
        )}

        {/* Publications: one per row, grouped by year */}
        <div className="mt-14">
          {data === null && (
            <div>
              <div
                className="pub-pulse"
                style={{ width: '90px', height: '34px', borderRadius: '8px', backgroundColor: theme.colors.newsBg }}
                aria-hidden="true"
              />
              <div className="flex flex-col gap-8 mt-6">
                <PublicationSkeleton />
                <PublicationSkeleton />
              </div>
            </div>
          )}

          {data && data.publications.length === 0 && (
            <p className="m-0" style={{ fontFamily: theme.fonts.body, fontSize: '1.1rem', color: theme.colors.body }}>
              Publications will be listed here soon.
            </p>
          )}

          {groups.map((group, gi) => (
            <div key={group.year} className={gi === 0 ? '' : 'mt-14'}>
              <h2
                className="m-0 text-3xl sm:text-4xl"
                style={{ fontFamily: theme.fonts.heading, fontWeight: 400, color: theme.colors.accent }}
              >
                {group.year}
              </h2>
              <div className="flex flex-col gap-8 mt-6">
                {group.items.map((item) => (
                  <PublicationCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Publications;