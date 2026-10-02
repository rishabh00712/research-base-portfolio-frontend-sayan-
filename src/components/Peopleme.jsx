// PeopleMe.jsx - the whole People page in one file (no other local imports except theme)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import theme from '../theme';

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

/* ---------- Fetch once, cache, start as soon as the file is imported ---------- */
let peoplePromise = null;
const fetchPeople = () => {
  if (!peoplePromise) {
    peoplePromise = fetch(`${API_URL}/api/people`)
      .then((res) => res.json())
      .catch((err) => {
        console.error('Failed to load people:', err);
        peoplePromise = null;
        return null;
      });
  }
  return peoplePromise;
};
fetchPeople();

let teamPromise = null;
const fetchTeam = () => {
  if (!teamPromise) {
    teamPromise = fetch(`${API_URL}/api/team-members`)
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Failed to load team members:', err);
        teamPromise = null;
        return [];
      });
  }
  return teamPromise;
};
fetchTeam();

/* ---------- Scroll-reveal helpers ---------- */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Becomes true once the element scrolls into view (works even if it mounts late) */
const useInView = (threshold = 0.1) => {
  const [visible, setVisible] = useState(false);
  const observerRef = useRef(null);

  const ref = useCallback(
    (node) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observerRef.current?.disconnect();
          }
        },
        { threshold, rootMargin: '0px 0px 10% 0px' }
      );
      observerRef.current.observe(node);
    },
    [threshold]
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [ref, visible];
};

/* Fade + slide up, with an optional delay for staggering.
   Returns nothing (element just shows) if the visitor prefers reduced motion. */
const reveal = (visible, delay = 0, distance = 20) => {
  if (prefersReducedMotion()) return {};
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : `translateY(${distance}px)`,
    transition: `opacity 500ms ease ${delay}ms, transform 500ms cubic-bezier(.2,.8,.2,1) ${delay}ms`,
  };
};

/* ---------- Text formatting ----------
   **words** -> bold     !!words!! -> italic (tilted)     ##words## -> underlined
   They can be mixed or nested, e.g.  **##bold and underlined##**
   A marker with no closing partner (like "Wow!!") is shown as normal text. */
const MARKS = { '**': 'bold', '!!': 'italic', '##': 'underline' };

// Turns a text into a list of words; each word is a list of pieces {text, bold, italic, underline}
const parseFormatting = (text = '') => {
  const parts = String(text).split(/(\*\*|!!|##)/);
  const flags = { bold: false, italic: false, underline: false };
  const words = [];
  let current = [];
  const flush = () => {
    if (current.length) {
      words.push(current);
      current = [];
    }
  };

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
    part.split(/(\s+)/).forEach((chunk) => {
      if (!chunk) return;
      if (/^\s+$/.test(chunk)) flush();
      else current.push({ text: chunk, ...flags });
    });
  });
  flush();
  return words;
};

const UNDERLINE = { textDecoration: 'underline', textUnderlineOffset: '4px' };

const pieceStyle = (p) => ({
  fontWeight: p.bold ? 700 : undefined,
  fontStyle: p.italic ? 'italic' : undefined,
  ...(p.underline ? UNDERLINE : {}),
});

/* Static formatted text (no animation) - used for the position line and the bio */
const Formatted = ({ text }) => {
  const words = parseFormatting(text);
  return words.map((pieces, i) => {
    const joinUnderline = i > 0 && words[i - 1].at(-1).underline && pieces[0].underline;
    return (
      <React.Fragment key={i}>
        {i > 0 && <span style={joinUnderline ? UNDERLINE : undefined}> </span>}
        {pieces.map((p, j) => (
          <span key={j} style={pieceStyle(p)}>
            {p.text}
          </span>
        ))}
      </React.Fragment>
    );
  });
};

/* ---------- Load animation helpers (play once when the page heading appears) ---------- */
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
              <span key={c} className="pm-letter" style={{ animationDelay: `${start + (n++) * 40}ms` }}>
                {ch}
              </span>
            ))}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};

// Description: words fade up in a quick wave (delay is capped so long text stays fast)
// Also applies the bold / italic / underline formatting.
const Words = ({ text, start = 0 }) => {
  const words = parseFormatting(text);
  return words.map((pieces, i) => {
    const joinUnderline = i > 0 && words[i - 1].at(-1).underline && pieces[0].underline;
    return (
      <React.Fragment key={i}>
        {i > 0 && <span style={joinUnderline ? UNDERLINE : undefined}> </span>}
        <span className="pm-word" style={{ animationDelay: `${start + Math.min(i * 18, 1000)}ms` }}>
          {pieces.map((p, j) => (
            <span key={j} style={pieceStyle(p)}>
              {p.text}
            </span>
          ))}
        </span>
      </React.Fragment>
    );
  });
};

/* ---------- Icons (inline SVG) ---------- */
const ScholarIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path fill="#4285F4" d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" />
  </svg>
);

const UniversityIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path
      fill={theme.colors.accent}
      d="M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z"
    />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path
      fill="#0A66C2"
      d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
    />
  </svg>
);

const OrcidIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#A6CE39" />
    <text x="12" y="15.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
      iD
    </text>
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path
      fill="#181717"
      d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
    />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      fill="#000"
      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
    />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2.5" fill="#0078D4" />
    <path d="M3.5 7.5 12 13l8.5-5.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* SPIE: red circle with a white "S." */
const SpieIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#E4002B" />
    <text x="11.5" y="17" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">
      S.
    </text>
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path
      fill={theme.colors.body}
      d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"
    />
  </svg>
);

/* Pick an icon from the "name" column (and the link address) of social_media_links */
const pickIcon = (name = '', link = '') => {
  const n = name.toLowerCase().trim();
  const l = (link || '').toLowerCase();
  if (n.includes('spie') || l.includes('spie.org')) return SpieIcon;
  if (n.includes('github') || l.includes('github.com')) return GitHubIcon;
  if (n === 'x' || n.startsWith('x ') || n.includes('twitter') || l.includes('twitter.com') || /(^|\/\/|www\.)x\.com/.test(l)) return XIcon;
  if (n.includes('scholar')) return ScholarIcon;
  if (n.includes('linkedin')) return LinkedInIcon;
  if (n.includes('orcid')) return OrcidIcon;
  if (n.includes('mail') || n.includes('outlook')) return MailIcon;
  if (/(macewan|university|institution|faculty|profile)/.test(n)) return UniversityIcon;
  return LinkIcon;
};

/* Turn rows from the API ({ id, name, link }) into ready-to-render links */
const toSocialLinks = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .filter((row) => row.link)
    .map((row) => {
      let href = row.link.trim();
      if (!/^(https?:|mailto:|tel:)/i.test(href)) {
        href = href.includes('@') ? `mailto:${href}` : `https://${href}`;
      }
      return { key: row.id, label: row.name, Icon: pickIcon(row.name, href), href };
    });

/* ---------- One icon: outer span pops in, inner link handles hover ---------- */
const IconLink = ({ href, label, index, visible, baseDelay, children }) => {
  const delay = baseDelay + index * 80;
  const pop = prefersReducedMotion()
    ? {}
    : {
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.6)',
        transition: `opacity 400ms ease ${delay}ms, transform 450ms cubic-bezier(.34,1.56,.64,1) ${delay}ms`,
      };

  return (
    <span className="inline-flex" style={pop}>
      <a
        href={href}
        target={href.startsWith('mailto:') ? undefined : '_blank'}
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className="social-icon flex items-center justify-center rounded-full"
        style={{
          width: '56px',
          height: '56px',
          backgroundColor: '#fff',
          border: `1px solid ${theme.colors.newsBorder}`,
        }}
      >
        {children}
      </a>
    </span>
  );
};

/* ---------- The row of icons ---------- */
const SocialIcons = ({ links, visible, baseDelay = 350 }) => {
  if (!links || links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3.5">
      <style>{`
        .social-icon { transition: transform 200ms ease, box-shadow 200ms ease; }
        .social-icon:hover { transform: translateY(-3px); box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
        @media (prefers-reduced-motion: reduce) { .social-icon { transition: none; } }
      `}</style>
      {links.map(({ key, label, Icon, href }, i) => (
        <IconLink key={key} href={href} label={label} index={i} visible={visible} baseDelay={baseDelay}>
          <Icon />
        </IconLink>
      ))}
    </div>
  );
};

/* ---------- Team members ---------- */
const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

const toSiteUrl = (link = '') => {
  const l = (link || '').trim();
  if (!l) return '';
  return /^https?:\/\//i.test(l) ? l : `https://${l}`;
};

const TeamCard = ({ member, index }) => {
  const [ref, visible] = useInView(0.15);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const href = toSiteUrl(member.link);
  const showImage = member.image && !failed;

  return (
    // outer li = bottom-to-up reveal (staggered by column), inner div = hover lift
    <li ref={ref} className="m-0 p-0" style={reveal(visible, (index % 4) * 100, 32)}>
      <div
        className="team-card box-border h-full flex flex-col items-center text-center"
        style={{
          backgroundColor: '#fff',
          border: `1px solid ${theme.colors.newsBorder}`,
          borderRadius: '28px',
          padding: '32px 24px',
        }}
      >
        {/* Round photo (lazy-loaded, fades in) */}
        <div
          className="flex items-center justify-center overflow-hidden"
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            backgroundColor: theme.colors.newsBg,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          {showImage ? (
            <img
              src={member.image}
              alt={member.name}
              width="120"
              height="120"
              loading="lazy"
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: loaded ? 1 : 0,
                transition: 'opacity 600ms ease',
              }}
            />
          ) : (
            <span
              style={{
                fontFamily: theme.fonts.heading,
                fontSize: '2rem',
                color: theme.colors.accent,
              }}
            >
              {initials(member.name)}
            </span>
          )}
        </div>

        <h3
          className="m-0 mt-5"
          style={{
            fontFamily: theme.fonts.heading,
            fontWeight: 500,
            fontSize: '1.35rem',
            lineHeight: 1.25,
            color: theme.colors.heading,
          }}
        >
          {member.name}
        </h3>

        {member.role && (
          <p
            className="m-0 mt-1"
            style={{ fontFamily: theme.fonts.body, fontSize: '1rem', color: theme.colors.body }}
          >
            {member.role}
          </p>
        )}

        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="team-btn uppercase inline-block mt-auto"
            style={{
              fontFamily: theme.fonts.main,
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textDecoration: 'none',
              borderRadius: '999px',
              padding: '8px 18px',
              marginTop: '20px',
            }}
          >
            View site <span className="team-arrow">↗</span>
          </a>
        )}
      </div>
    </li>
  );
};

const TeamSkeleton = () => (
  <li className="m-0 p-0">
    <div
      className="team-skel box-border h-full flex flex-col items-center"
      style={{
        backgroundColor: '#fff',
        border: `1px solid ${theme.colors.newsBorder}`,
        borderRadius: '28px',
        padding: '32px 24px',
      }}
    >
      <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: theme.colors.newsBg }} />
      <div style={{ width: '60%', height: '16px', borderRadius: '8px', backgroundColor: theme.colors.newsBg, marginTop: '24px' }} />
      <div style={{ width: '40%', height: '12px', borderRadius: '6px', backgroundColor: theme.colors.newsBg, marginTop: '12px' }} />
    </div>
  </li>
);

const TeamSection = () => {
  const [team, setTeam] = useState(null); // null = still loading
  const [headRef, headVisible] = useInView(0.2);

  useEffect(() => {
    let alive = true;
    fetchTeam().then((data) => {
      if (alive) setTeam(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (team && team.length === 0) return null;

  return (
    <div className="mt-20">
      <style>{`
        .team-card { transition: transform 220ms ease, box-shadow 220ms ease; }
        .team-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.06); }
        .team-btn {
          color: ${theme.colors.accent};
          background-color: ${theme.colors.newsBg};
          border: 1px solid ${theme.colors.newsBorder};
          transition: background-color 200ms ease, color 200ms ease, border-color 200ms ease;
        }
        .team-btn:hover { color: #fff; background-color: ${theme.colors.accent}; border-color: ${theme.colors.accent}; }
        .team-btn .team-arrow { display: inline-block; transition: transform 200ms ease; }
        .team-btn:hover .team-arrow { transform: translate(2px, -2px); }
        @keyframes team-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        .team-skel { animation: team-pulse 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .team-card, .team-btn, .team-btn .team-arrow { transition: none; }
          .team-card:hover { transform: none; }
          .team-skel { animation: none; }
        }
      `}</style>

      <div ref={headRef} style={reveal(headVisible, 0, 16)}>
        <h2
          className="m-0 text-3xl sm:text-4xl"
          style={{ fontFamily: theme.fonts.heading, fontWeight: 400, color: theme.colors.heading }}
        >
          Team members
        </h2>
      </div>

      {/* Auto-fill grid: side by side, wraps and scales to any number of members */}
      <ul
        className="list-none m-0 mt-10 p-0 grid gap-6"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
      >
        {team === null
          ? [0, 1, 2].map((i) => <TeamSkeleton key={i} />)
          : team.map((member, i) => <TeamCard key={member.id} member={member} index={i} />)}
      </ul>
    </div>
  );
};

/* ---------- Page ---------- */
const PeopleMe = () => {
  const [person, setPerson] = useState(null);
  const [cardRef, cardVisible] = useInView(0.1);

  useEffect(() => {
    let alive = true;
    fetchPeople().then((data) => {
      if (alive && data && !data.error) setPerson(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!person) return null;

  // mid_description: 1st line = position/department line, the rest = the bio
  const lines = (person.mid_description || '')
    .split(/\r?\n+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const [positionLine, ...bioParagraphs] = lines;

  const roles = Array.isArray(person.work_role) ? person.work_role.filter(Boolean) : [];
  const links = toSocialLinks(person.social_links);

  // staggered fade-up for things inside the card
  const r = (delay) => reveal(cardVisible, delay, 14);

  return (
    <section className="w-full box-border px-6 sm:px-12 pt-16 pb-20">
      <style>{`
        .people-bio .people-arrow { display: inline-block; transition: transform 200ms ease; }
        .people-bio:hover .people-arrow { transform: translateX(4px); }
        @media (prefers-reduced-motion: reduce) { .people-bio .people-arrow { transition: none; } }

        /* page-load animation for the heading block (plays once) */
        @keyframes pm-rise {
          from { opacity: 0; transform: translateY(0.45em); }
          to   { opacity: 1; transform: none; }
        }
        .pm-label  { opacity: 0; animation: pm-rise 600ms ease-out forwards; }
        .pm-letter { display: inline-block; opacity: 0; animation: pm-rise 550ms cubic-bezier(.2,.8,.2,1) forwards; }
        .pm-word   { display: inline-block; opacity: 0; animation: pm-rise 500ms ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .pm-label, .pm-letter, .pm-word { animation: none; opacity: 1; }
        }
      `}</style>

      <div className="mx-auto max-w-6xl">
        {/* Heading (animated on load) */}
        <div>
          <p
            className="pm-label uppercase m-0 mb-2"
            style={{
              fontFamily: theme.fonts.main,
              color: theme.colors.accent,
              fontSize: '0.85rem',
              letterSpacing: '0.25em',
            }}
          >
            The group
          </p>
          <h1
            className="m-0 text-4xl sm:text-5xl"
            style={{ fontFamily: theme.fonts.heading, fontWeight: 400, color: theme.colors.heading }}
          >
            <Letters text="People" start={60} />
          </h1>
          {person.one_line_description && (
            <p
              className="m-0 mt-4"
              style={{
                fontFamily: theme.fonts.body,
                fontSize: '1.15rem',
                lineHeight: 1.6,
                color: theme.colors.body,
              }}
            >
              <Words text={person.one_line_description} start={350} />
            </p>
          )}
        </div>

        {/* One card: photo + details + links */}
        <div
          ref={cardRef}
          className="mt-14 box-border grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-8 md:gap-12 items-center"
          style={{
            ...reveal(cardVisible, 0, 28),
            backgroundColor: '#fff',
            border: `1px solid ${theme.colors.newsBorder}`,
            borderRadius: '28px',
            padding: '40px',
          }}
        >
          {/* Photo */}
          {person.image && (
            <div className="flex justify-center" style={r(150)}>
              <img
                src={person.image}
                alt={person.name}
                width="200"
                height="200"
                style={{
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                }}
              />
            </div>
          )}

          {/* Details */}
          <div>
            <p
              className="uppercase m-0"
              style={{
                fontFamily: theme.fonts.main,
                color: theme.colors.accent,
                fontSize: '0.8rem',
                letterSpacing: '0.2em',
                ...r(100),
              }}
            >
              Research Scholar
            </p>

            <h2
              className="m-0 mt-2"
              style={{
                fontFamily: theme.fonts.heading,
                fontWeight: 500,
                fontSize: '2rem',
                lineHeight: 1.2,
                color: theme.colors.heading,
                ...r(180),
              }}
            >
              {person.name}
            </h2>

            {positionLine && (
              <p
                className="m-0 mt-2"
                style={{
                  fontFamily: theme.fonts.body,
                  fontSize: '1.05rem',
                  color: theme.colors.body,
                  ...r(240),
                }}
              >
                <Formatted text={positionLine} />
              </p>
            )}

            {bioParagraphs.length > 0 && (
              <div className="mt-5" style={{ maxWidth: '40rem', ...r(300) }}>
                {bioParagraphs.map((text, i) => (
                  <p
                    key={i}
                    className="m-0 mb-3"
                    style={{
                      fontFamily: theme.fonts.body,
                      fontSize: '1.05rem',
                      lineHeight: 1.7,
                      color: theme.colors.body,
                    }}
                  >
                    <Formatted text={text} />
                  </p>
                ))}
              </div>
            )}

            {/* Work roles */}
            {roles.length > 0 && (
              <ul className="list-none m-0 mt-5 p-0 flex flex-wrap gap-3" style={r(380)}>
                {roles.map((role) => (
                  <li
                    key={role}
                    className="uppercase"
                    style={{
                      fontFamily: theme.fonts.main,
                      fontSize: '0.75rem',
                      letterSpacing: '0.15em',
                      color: theme.colors.accent,
                      backgroundColor: theme.colors.newsBg,
                      border: `1px solid ${theme.colors.newsBorder}`,
                      borderRadius: '999px',
                      padding: '8px 18px',
                    }}
                  >
                    {role}
                  </li>
                ))}
              </ul>
            )}

            {/* Full bio + social links */}
            <div className="flex flex-wrap items-center gap-6 mt-7">
              <Link
                to="/dr-ferrocene"
                className="people-bio uppercase"
                style={{
                  fontFamily: theme.fonts.main,
                  color: theme.colors.accent,
                  fontSize: '0.8rem',
                  letterSpacing: '0.2em',
                  textDecoration: 'none',
                  ...r(450),
                }}
              >
                Full bio <span className="people-arrow">→</span>
              </Link>

              <SocialIcons links={links} visible={cardVisible} baseDelay={550} />
            </div>
          </div>
        </div>

        <TeamSection />
      </div>
    </section>
  );
};

export default PeopleMe;