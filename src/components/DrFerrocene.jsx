// DrFerrocene.jsx - the whole Dr. Ferrocene page:
// 1) intro (name + description + hobbies on a ballpit background)  2) Education & Career  3) Contact
import React, { useEffect, useState } from 'react';
import theme from '../theme';
import Ballpit from './Ballpit';
import EducationCareer from './Educationcareer';
import ContactSection from './Contactsection';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* Start fetching the moment this file is imported, so the data is usually ready
   before the person opens the page. */
let aboutPromise = null;
const fetchAbout = () => {
  if (!aboutPromise) {
    aboutPromise = fetch(`${API_URL}/api/about`)
      .then((res) => res.json())
      .catch((err) => {
        console.error('Failed to load about:', err);
        aboutPromise = null; // allow retry on next visit
        return null;
      });
  }
  return aboutPromise;
};
fetchAbout();

/* "Dr. Hriday Bhattacharjee" -> "Hriday" (drop the title, keep only the first name) */
const TITLE_RE = /^(dr|prof|professor|mr|mrs|ms|mx)\.?$/i;

const getShortName = (full = '') => {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  const rest = parts.filter((p) => !TITLE_RE.test(p));
  return rest[0] || parts[0] || '';
};

/* ---------- Ballpit settings (colors come from theme.jsx) ---------- */
const BALL_COLORS = [
  theme.colors.heroBallLight,
  theme.colors.heroBallChocolate,
  theme.colors.heroBallDark,
];
const BALL_MATERIAL = {
  metalness: 0.15, // low metalness keeps the highlights white
  roughness: 0.45,
  clearcoat: 1, // glossy white shine
  clearcoatRoughness: 0.1,
};

// Used only to pick how many balls to draw (fewer on phones so it stays smooth)
const useIsDesktop = () => {
  const query = '(min-width: 1024px)';
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatch(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return match;
};

/* Ballpit background with a smooth load:
   1) wait a moment so the text animation starts first,
   2) set up the 3D scene (this is the heavy part) while still invisible,
   3) fade it in on the next frames. */
const BallpitBackground = ({ count }) => {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let r2;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [mounted]);

  if (!mounted) return null;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        opacity: visible ? 1 : 0,
        transition: reduceMotion ? 'none' : 'opacity 1400ms ease-out',
      }}
    >
      <Ballpit
        count={count}
        gravity={0.2}
        friction={0.9975}
        wallBounce={0.95}
        followCursor={false}
        colors={BALL_COLORS}
        materialParams={BALL_MATERIAL}
      />
    </div>
  );
};

/* ---------- Text formatting inside the long description ----------
   **words** -> bold     !!words!! -> italic (tilted)     ##words## -> underlined
   They can be mixed or nested, e.g.  **##bold and underlined##**
   A marker with no closing partner (like "Wow!!") is shown as normal text. */
const MARKS = { '**': 'bold', '!!': 'italic', '##': 'underline' };

// Turns a paragraph into a list of words; each word is a list of pieces {text, bold, italic, underline}
const parseFormatting = (text) => {
  const parts = text.split(/(\*\*|!!|##)/);
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

/* ---------- Load animation helpers (play once when the page appears) ---------- */
// Heading: every letter rises in one after another
const Letters = ({ text }) => {
  let n = 0;
  return (
    <span aria-label={text}>
      {text.split(' ').map((word, w) => (
        <React.Fragment key={w}>
          {w > 0 && ' '}
          <span aria-hidden="true" style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {[...word].map((ch, c) => (
              <span key={c} className="fx-letter" style={{ animationDelay: `${(n++) * 45}ms` }}>
                {ch}
              </span>
            ))}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};

// Paragraph: words fade up quickly, one after another (delay is capped so long text stays fast)
// Also applies the bold / italic / underline formatting.
const Words = ({ text, start = 0 }) => {
  const words = parseFormatting(text);
  return words.map((pieces, i) => {
    // keep the underline unbroken between two underlined words
    const joinUnderline = i > 0 && words[i - 1].at(-1).underline && pieces[0].underline;
    return (
      <React.Fragment key={i}>
        {i > 0 && <span style={joinUnderline ? UNDERLINE : undefined}> </span>}
        <span className="fx-word" style={{ animationDelay: `${350 + Math.min((start + i) * 18, 1000)}ms` }}>
          {pieces.map((p, j) => (
            <span
              key={j}
              style={{
                fontWeight: p.bold ? 700 : undefined,
                fontStyle: p.italic ? 'italic' : undefined,
                ...(p.underline ? UNDERLINE : {}),
              }}
            >
              {p.text}
            </span>
          ))}
        </span>
      </React.Fragment>
    );
  });
};

/* ---------- Intro: ballpit background, name + description blocks in the middle ---------- */
const Intro = ({ profile }) => {
  const isDesktop = useIsDesktop();
  const shortName = getShortName(profile.name);
  const paragraphs = (profile.long_description || '')
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const hobbies = Array.isArray(profile.hobbies) ? profile.hobbies : [];

  // running word count so the paragraphs animate one continuous wave
  const offsets = [];
  paragraphs.reduce((sum, p) => {
    offsets.push(sum);
    return sum + parseFormatting(p).length;
  }, 0);

  // shared look for the name + description blocks (color = theme.colors.heroBlock)
  const brownBlock = {
    backgroundColor: theme.colors.heroBlock,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: theme.colors.heroCardShadow,
  };

  return (
    <section
      className="relative w-full box-border overflow-hidden px-6 sm:px-12 py-16 flex items-center justify-center"
      style={{ minHeight: '85vh' }}
    >
      <style>{`
        @keyframes fx-rise {
          from { opacity: 0; transform: translateY(0.45em); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes fx-pop {
          from { opacity: 0; transform: translateY(10px) scale(0.92); }
          to   { opacity: 1; transform: none; }
        }

        .fx-letter { display: inline-block; opacity: 0; animation: fx-rise 550ms cubic-bezier(.2,.8,.2,1) forwards; }
        .fx-word   { display: inline-block; opacity: 0; animation: fx-rise 500ms ease-out forwards; }
        .fx-tag    { opacity: 0; animation: fx-pop 450ms cubic-bezier(.2,.8,.2,1) forwards; }

        @media (prefers-reduced-motion: reduce) {
          .fx-letter, .fx-word, .fx-tag { animation: none; opacity: 1; }
        }
      `}</style>

      {/* Background: ballpit fills the whole section (desktop AND mobile) */}
      <BallpitBackground count={isDesktop ? 90 : 45} />

      {/* Middle column: name block, description block, hobbies */}
      <div
        className="relative w-full flex flex-col items-center gap-6"
        style={{ zIndex: 1, maxWidth: '46rem' }}
      >
        {/* Name block */}
        <div
          className="box-border px-8 sm:px-12 py-5 sm:py-6 max-w-full"
          style={{ ...brownBlock, borderRadius: '24px' }}
        >
          <h1
            className="m-0 text-5xl sm:text-6xl text-center"
            style={{
              fontFamily: theme.fonts.heading,
              fontWeight: 400,
              lineHeight: 1.1,
              color: theme.colors.heroText,
            }}
          >
            <Letters text={`Hi, I'm ${shortName}.`} />
          </h1>
        </div>

        {/* Description block */}
        {paragraphs.length > 0 && (
          <div
            className="box-border w-full px-8 sm:px-12 py-8 sm:py-10"
            style={{ ...brownBlock, borderRadius: '28px' }}
          >
            {paragraphs.map((text, i) => (
              <p
                key={i}
                className="m-0 mb-5 last:mb-0"
                style={{
                  fontFamily: theme.fonts.body,
                  fontSize: '1.1rem',
                  lineHeight: 1.8,
                  fontWeight: 400,
                  color: theme.colors.heroTextSoft,
                }}
              >
                <Words text={text} start={offsets[i]} />
              </p>
            ))}
          </div>
        )}

        {/* Hobbies: light pink pills with a thin red border */}
        {hobbies.length > 0 && (
          <ul className="list-none m-0 p-0 flex flex-wrap justify-center gap-3">
            {hobbies.map((hobby, i) => (
              <li
                key={hobby}
                className="uppercase fx-tag"
                style={{
                  animationDelay: `${1000 + i * 110}ms`,
                  fontFamily: theme.fonts.main,
                  fontSize: '0.75rem',
                  letterSpacing: '0.15em',
                  color: theme.colors.heroTagText,           // changed: crimson text
                  backgroundColor: theme.colors.heroTagBg,   // changed: light pink
                  border: `1px solid ${theme.colors.heroTagBorder}`,
                  borderRadius: '999px',
                  padding: '8px 18px',
                }}
              >
                {hobby}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

/* ---------- Page ---------- */
const DrFerrocene = () => {
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false); // true once the about request has finished (success OR error)

  useEffect(() => {
    let alive = true;
    fetchAbout().then((data) => {
      if (!alive) return;
      setProfile(data);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Nothing is shown until the about data is here, so the sections always
  // appear together in the right order: intro -> education -> contact.
  // (min-height keeps the footer from jumping while loading)
  if (!ready) return <div style={{ minHeight: '70vh' }} aria-hidden="true" />;

  return (
    <>
      {profile && <Intro profile={profile} />}
      <EducationCareer />
      <ContactSection />
    </>
  );
};

export default DrFerrocene;