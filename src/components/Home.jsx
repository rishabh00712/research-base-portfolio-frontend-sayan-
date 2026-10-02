// Home.jsx - the whole landing page:
// 1) hero (animated on load)  2) Explore  3) News
import React, { useEffect, useRef, useState } from 'react';
import theme from '../theme';
import Explore from './Explore';
import News from './News';

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

/* Start fetching the moment this file is imported (i.e. when the site first loads),
   so the data is usually ready before the person even opens the home page. */
let profilePromise = null;
const fetchProfile = () => {
  if (!profilePromise) {
    profilePromise = fetch(`${API_URL}/api/profile`)
      .then((res) => res.json())
      .catch((err) => {
        console.error('Failed to load profile:', err);
        profilePromise = null; // allow retry on next visit
        return null;
      });
  }
  return profilePromise;
};
fetchProfile();

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

// "a **b** c" -> [{ text: 'a ', style: {} }, { text: 'b', style: {bold} }, { text: ' c', style: {} }]
const parseRich = (str, style = {}) => {
  const out = [];
  let i = 0;
  let buf = '';
  while (i < str.length) {
    const mark = str.slice(i, i + 2);
    if (MARKERS[mark]) {
      const end = str.indexOf(mark, i + 2);
      if (end !== -1) {
        if (buf) {
          out.push({ text: buf, style });
          buf = '';
        }
        out.push(...parseRich(str.slice(i + 2, end), { ...style, ...MARKERS[mark] }));
        i = end + 2;
        continue;
      }
    }
    buf += str[i];
    i++;
  }
  if (buf) out.push({ text: buf, style });
  return out;
};

// plain text version (for the title, alt text etc.)
const stripMarks = (text) => String(text || '').replace(/\*\*|!!|##/g, '');

/* ---------- Social icons (matched by the `name` column) ---------- */
const iconProps = { width: 24, height: 24, viewBox: '0 0 24 24' };

const ScholarIcon = () => (
  <svg {...iconProps}>
    <path fill="#4285F4" d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3z" />
    <path fill="#356AC3" d="M5 13.2V17c0 1.7 3.1 3 7 3s7-1.3 7-3v-3.8l-7 3.8-7-3.8z" />
  </svg>
);

const InstitutionIcon = () => (
  <svg {...iconProps}>
    <path fill="#8B1E3F" d="M12 2 2 7v2h20V7L12 2zM4 10v7h3v-7H4zm6.5 0v7h3v-7h-3zM17 10v7h3v-7h-3zM2 19v3h20v-3H2z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg {...iconProps}>
    <rect width="24" height="24" rx="3" fill="#0A66C2" />
    <path fill="#fff" d="M5 9h3v10H5V9zm1.5-4.5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5zM10 9h2.9v1.4c.5-.9 1.6-1.6 3.1-1.6 3 0 3.5 2 3.5 4.5V19h-3v-5c0-1.2 0-2.6-1.6-2.6S13 12.700 13 14v5h-3V9z" />
  </svg>
);

const OrcidIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="11" fill="#A6CE39" />
    <path fill="#fff" d="M8 7.2a.9.9 0 1 1-1.800 0 .9.9 0 0 1 1.800 0zM6.300 9h1.600v7H6.300V9zm3 0h3.400c2.700 0 4 1.500 4 3.500S15.400 16 12.700 16H9.300V9zm1.600 1.400v4.200h1.700c1.800 0 2.500-.9 2.500-2.100s-.7-2.100-2.500-2.100h-1.700z" />
  </svg>
);

const EmailIcon = () => (
  <svg {...iconProps}>
    <rect x="2" y="5" width="20" height="14" rx="2" fill="#0F78D4" />
    <path fill="none" stroke="#fff" strokeWidth="1.8" d="m3 7 9 6 9-6" />
  </svg>
);

const GitHubIcon = () => (
  <svg {...iconProps}>
    <path fill="#24292F" d="M12 .5a11.500 11.500 0 0 0-3.640 22.410c.580.110.790-.250.790-.560v-2c-3.200.700-3.880-1.400-3.880-1.400-.520-1.330-1.280-1.690-1.280-1.690-1.040-.710.080-.700.080-.700 1.150.080 1.760 1.180 1.760 1.180 1.020 1.760 2.680 1.250 3.330.960.100-.740.400-1.250.730-1.540-2.560-.290-5.240-1.280-5.240-5.690 0-1.260.450-2.290 1.180-3.100-.120-.290-.510-1.470.110-3.060 0 0 .970-.310 3.170 1.180a10.900 10.900 0 0 1 5.780 0c2.200-1.490 3.170-1.180 3.170-1.180.630 1.590.230 2.770.110 3.060.740.810 1.180 1.840 1.180 3.100 0 4.420-2.690 5.390-5.260 5.670.410.360.780 1.060.780 2.140v3.170c0 .310.210.680.800.560A11.500 11.500 0 0 0 12 .5z" />
  </svg>
);

const TwitterIcon = () => (
  <svg {...iconProps}>
    <path fill="#111" d="M17.750 3h3.070l-6.700 7.660L22 21h-6.170l-4.830-6.320L5.470 21H2.400l7.170-8.190L2 3h6.330l4.370 5.780L17.750 3zm-1.080 16.160h1.700L7.400 4.740H5.580l11.090 14.420z" />
  </svg>
);

// SPIE: red circle with a white "S." (like the SPIE site icon)
const SpieIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="11" fill="#E4002B" />
    <text
      x="11.500"
      y="17"
      textAnchor="middle"
      fontSize="15"
      fontWeight="800"
      fill="#fff"
      fontFamily="Arial, Helvetica, sans-serif"
    >
      S.
    </text>
  </svg>
);

// key = lowercase keyword found in the `name` column
const ICON_MAP = [
  { match: ['scholar'], Icon: ScholarIcon },
  { match: ['institution', 'university', 'college', 'department', 'website', 'faculty'], Icon: InstitutionIcon },
  { match: ['linkedin'], Icon: LinkedInIcon },
  { match: ['orcid'], Icon: OrcidIcon },
  { match: ['spie'], Icon: SpieIcon },
  { match: ['email', 'mail', 'outlook'], Icon: EmailIcon },
  { match: ['github'], Icon: GitHubIcon },
  { match: ['twitter', 'x'], Icon: TwitterIcon },
];

const getIcon = (name = '') => {
  const n = name.toLowerCase().trim();
  const found = ICON_MAP.find(({ match }) => match.some((m) => (m === 'x' ? n === 'x' : n.includes(m))));
  return found ? found.Icon : null;
};

const buildHref = (name = '', link = '') => {
  const isEmail = name.toLowerCase().includes('mail') || name.toLowerCase().includes('outlook');
  if (isEmail && link.includes('@') && !link.startsWith('mailto:')) return `mailto:${link}`;
  return link;
};

/* ---------- Load animation helpers (play once when the hero appears) ---------- */
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
              <span key={c} className="hm-letter" style={{ animationDelay: `${start + (n++) * 40}ms` }}>
                {ch}
              </span>
            ))}
          </span>
        </React.Fragment>
      ))}
    </span>
  );
};

// Description: words fade up in a quick wave (delay is capped so long text stays fast).
// Understands **bold**, !!italic!!, ##underline## (also across several words).
const Words = ({ text, start = 0 }) => {
  let n = 0;
  const segments = parseRich(String(text || ''));
  return segments.flatMap((seg, si) =>
    seg.text
      .split(/(\s+)/)
      .filter(Boolean)
      .map((part, pi) => {
        const key = `${si}-${pi}`;
        // spaces keep the style too, so an underline stays continuous across words
        if (/^\s+$/.test(part)) {
          return (
            <span key={key} style={seg.style}>
              {' '}
            </span>
          );
        }
        const delay = start + Math.min(n++ * 18, 1000);
        return (
          <span key={key} className="hm-word" style={{ ...seg.style, animationDelay: `${delay}ms` }}>
            {part}
          </span>
        );
      })
  );
};

/* ---------- Lab name: letter-rise on load + chocolate cursor lens on hover ----------
   A round "lens" follows the cursor over the title. Inside the lens the background
   turns chocolate and the text turns light. The lens grows in when the pointer enters,
   trails the cursor smoothly, and shrinks away when it leaves.
   Colors come from theme.js (textHover = dark chocolate). */
const LENS_RADIUS = 36; // px

const LabTitle = ({ text, start = 0 }) => {
  const headingRef = useRef(null);
  const lensRef = useRef(null);

  useEffect(() => {
    const heading = headingRef.current;
    const lens = lensRef.current;
    if (!heading || !lens) return undefined;

    // skip on touch screens and when the person prefers reduced motion
    const noHover = window.matchMedia('(hover: none)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (noHover || reduce) return undefined;

    const s = { x: 0, y: 0, tx: 0, ty: 0, r: 0, tr: 0 };
    let raf = 0;
    let running = false;

    const paint = () => {
      lens.style.clipPath = `circle(${s.r.toFixed(2)}px at ${s.x.toFixed(1)}px ${s.y.toFixed(1)}px)`;
    };

    const tick = () => {
      s.x += (s.tx - s.x) * 0.2; // the lens trails the cursor a little
      s.y += (s.ty - s.y) * 0.2;
      s.r += (s.tr - s.r) * 0.16; // grows in / shrinks out smoothly
      paint();

      const settled =
        Math.abs(s.tx - s.x) < 0.1 && Math.abs(s.ty - s.y) < 0.1 && Math.abs(s.tr - s.r) < 0.1;
      if (settled && s.tr === 0) {
        s.r = 0;
        paint();
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const start_ = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    const local = (e) => {
      const b = heading.getBoundingClientRect();
      return [e.clientX - b.left, e.clientY - b.top];
    };

    const onEnter = (e) => {
      const [x, y] = local(e);
      s.x = s.tx = x;
      s.y = s.ty = y;
      s.tr = LENS_RADIUS;
      start_();
    };
    const onMove = (e) => {
      const [x, y] = local(e);
      s.tx = x;
      s.ty = y;
      s.tr = LENS_RADIUS;
      start_();
    };
    const onLeave = () => {
      s.tr = 0;
      start_();
    };

    heading.addEventListener('pointerenter', onEnter);
    heading.addEventListener('pointermove', onMove);
    heading.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      heading.removeEventListener('pointerenter', onEnter);
      heading.removeEventListener('pointermove', onMove);
      heading.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <h1
      ref={headingRef}
      className="relative w-fit max-w-full m-0 mb-8 leading-tight text-5xl sm:text-6xl"
      style={{
        fontFamily: theme.fonts.heading,
        color: theme.colors.heading,
        fontWeight: 400,
      }}
    >
      <Letters text={text} start={start} />

      {/* lens layer: same text, chocolate background, light text, clipped to a circle */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          // soft chocolate shadow around the lens (theme.colors.textHover + alpha)
          filter: `drop-shadow(0 8px 16px ${theme.colors.textHover}59)`,
        }}
      >
        <span
          ref={lensRef}
          style={{
            position: 'absolute',
            inset: 0,
            background: theme.colors.textHover,
            color: theme.colors.background,
            clipPath: 'circle(0px at 0px 0px)',
            willChange: 'clip-path',
          }}
        >
          {text}
        </span>
      </span>
    </h1>
  );
};

/* ---------- Hero ---------- */
const Hero = ({ profile }) => {
  const socials = (profile.social_media_links || []).filter((s) => getIcon(s.name) && s.link);
  // title stays plain text (the cursor lens needs the exact same text), so markers are removed here
  const title = stripMarks(profile.lab_name);

  return (
    <section className="w-full box-border px-6 sm:px-12 py-12 lg:py-20">
      <style>{`
        @keyframes hm-rise {
          from { opacity: 0; transform: translateY(0.45em); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes hm-pop {
          from { opacity: 0; transform: translateY(12px) scale(0.9); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes hm-photo {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes hm-fade { from { opacity: 0; } to { opacity: 1; } }

        .hm-label  { opacity: 0; animation: hm-rise 600ms ease-out forwards; }
        .hm-letter { display: inline-block; opacity: 0; animation: hm-rise 550ms cubic-bezier(.2,.8,.2,1) forwards; }
        .hm-word   { display: inline-block; opacity: 0; animation: hm-rise 500ms ease-out forwards; }
        .hm-photo  { opacity: 0; animation: hm-photo 800ms cubic-bezier(.2,.8,.2,1) 100ms forwards; }
        .hm-glow   { opacity: 0; animation: hm-fade 1200ms ease-out 200ms forwards; }
        .hm-social { opacity: 0; animation: hm-pop 450ms cubic-bezier(.2,.8,.2,1) forwards; }

        @media (prefers-reduced-motion: reduce) {
          .hm-label, .hm-letter, .hm-word, .hm-photo, .hm-glow, .hm-social { animation: none; opacity: 1; }
        }
      `}</style>

      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* LEFT: text */}
        <div>
          <p
            className="hm-label uppercase m-0 mb-4"
            style={{
              fontFamily: theme.fonts.main,
              color: theme.colors.accent,
              fontSize: '1.15rem',
              letterSpacing: '0.35em',
            }}
          >
            Welcome to the
          </p>

          <LabTitle text={title} start={60} />

          <p
            className="m-0 text-lg"
            style={{
              fontFamily: theme.fonts.body,
              color: theme.colors.body,
              lineHeight: 1.75,
              fontWeight: 400,
              maxWidth: '34rem',
            }}
          >
            <Words text={profile.short_description || ''} start={450} />
          </p>
        </div>

        {/* RIGHT: image + social buttons */}
        <div className="relative flex flex-col items-center">
          {/* soft glow */}
          <div
            aria-hidden="true"
            className="hm-glow absolute rounded-full"
            style={{
              width: '520px',
              height: '520px',
              maxWidth: '120%',
              background: `radial-gradient(circle, ${theme.colors.glow} 0%, transparent 70%)`,
              top: '-40px',
              zIndex: 0,
            }}
          />

          {profile.image && (
            <img
              src={profile.image}
              alt={stripMarks(profile.name || profile.lab_name)}
              className="hm-photo relative object-cover rounded-full"
              style={{
                width: 'min(400px, 80vw)',
                height: 'min(400px, 80vw)',
                boxShadow: '0 20px 50px rgba(155, 28, 46, 0.12)',
                zIndex: 1,
              }}
            />
          )}

          {socials.length > 0 && (
            <div className="relative flex flex-wrap justify-center gap-3.5 mt-8" style={{ zIndex: 1 }}>
              {socials.map((s, i) => {
                const Icon = getIcon(s.name);
                return (
                  <a
                    key={s.id}
                    href={buildHref(s.name, s.link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    title={s.name}
                    className="hm-social flex items-center justify-center rounded-full bg-white transition-transform duration-300 ease-out hover:-translate-y-1"
                    style={{
                      animationDelay: `${900 + i * 90}ms`,
                      width: '56px',
                      height: '56px',
                      border: `1px solid ${theme.colors.iconBorder}`,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    }}
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* ---------- Page: hero first, then Explore, then News ---------- */
const Home = () => {
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false); // true once the profile request has finished (success OR error)

  useEffect(() => {
    let alive = true;
    fetchProfile().then((data) => {
      if (!alive) return;
      setProfile(data);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Nothing is shown until the profile is here, so the page always builds
  // top-down: hero -> Explore -> News (min-height keeps the footer from jumping).
  if (!ready) return <div style={{ minHeight: '70vh' }} aria-hidden="true" />;

  return (
    <>
      {profile && <Hero profile={profile} />}
      <Explore />
      <News />
    </>
  );
};

export default Home;