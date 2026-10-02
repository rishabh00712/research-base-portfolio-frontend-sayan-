// ContactSection.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import theme from '../theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ---------- Fetch once, cache, start as soon as the file is imported ---------- */
let contactPromise = null;
const fetchContact = () => {
  if (!contactPromise) {
    contactPromise = fetch(`${API_URL}/api/contact`)
      .then((res) => res.json())
      .catch((err) => {
        console.error('Failed to load contact info:', err);
        contactPromise = null;
        return null;
      });
  }
  return contactPromise;
};
fetchContact();

/* ---------- Social icons (inline SVG) ---------- */
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

const MailIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2.5" fill="#0078D4" />
    <path d="M3.5 7.5 12 13l8.5-5.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* NEW: X (formerly Twitter) */
const XIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      fill="#000"
      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
    />
  </svg>
);

/* NEW: GitHub */
const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path
      fill="#181717"
      d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
    />
  </svg>
);

/* NEW: SPIE - red circle with a white "S." */
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

/* Pick an icon from the "name" column of social_media_links
   (name the row "X" / "Twitter", "GitHub" or "SPIE" to get those icons) */
const pickIcon = (name = '') => {
  const n = name.trim().toLowerCase();
  if (n.includes('spie')) return SpieIcon;
  if (n === 'x' || n.includes('twitter') || n.includes('x.com')) return XIcon;
  if (n.includes('github')) return GitHubIcon;
  if (n.includes('scholar')) return ScholarIcon;
  if (n.includes('linkedin')) return LinkedInIcon;
  if (n.includes('orcid')) return OrcidIcon;
  if (n.includes('mail') || n.includes('outlook')) return MailIcon;
  if (/(macewan|university|institution|faculty|profile)/.test(n)) return UniversityIcon;
  return LinkIcon;
};

/* ---------- Reveal when scrolled into view ---------- */
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

/* Fade + slide up, with an optional delay for staggering */
const reveal = (visible, delay = 0, distance = 20) => ({
  opacity: visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : `translateY(${distance}px)`,
  transition: `opacity 500ms ease ${delay}ms, transform 500ms cubic-bezier(.2,.8,.2,1) ${delay}ms`,
});

/* ---------- Small pieces ---------- */
const Field = ({ label, children }) => (
  <div>
    <p className="m-0" style={{ fontFamily: theme.fonts.body, fontSize: '1rem', color: theme.colors.body }}>
      {label}
    </p>
    <div
      style={{
        fontFamily: theme.fonts.body,
        fontSize: '1.05rem',
        lineHeight: 1.5,
        color: theme.colors.heading,
        whiteSpace: 'pre-line',
      }}
    >
      {children}
    </div>
  </div>
);

const IconLink = ({ href, label, index, visible, children }) => (
  <span
    className="contact-pop inline-flex"
    style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.6)',
      transition: `opacity 400ms ease ${350 + index * 80}ms, transform 450ms cubic-bezier(.34,1.56,.64,1) ${350 + index * 80}ms`,
    }}
  >
    <a
      href={href}
      target={href.startsWith('mailto:') ? undefined : '_blank'}
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="contact-icon flex items-center justify-center rounded-full"
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

/* ---------- Section ---------- */
const ContactSection = () => {
  const [profile, setProfile] = useState(null);
  const [headRef, headVisible] = useInView(0.2);
  const [cardsRef, cardsVisible] = useInView(0.1);

  useEffect(() => {
    let alive = true;
    fetchContact().then((data) => {
      if (alive && data && !data.error) setProfile(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!profile) return null;

  const social = Array.isArray(profile.social_links) ? profile.social_links : [];
  const links = social
    .filter((row) => row.link)
    .map((row) => {
      let href = row.link.trim();
      if (!/^(https?:|mailto:|tel:)/i.test(href)) {
        href = href.includes('@') ? `mailto:${href}` : `https://${href}`;
      }
      return { key: row.id, label: row.name, Icon: pickIcon(row.name), href };
    });

  return (
    <section className="w-full box-border px-6 sm:px-12 pt-8 pb-20">
      <style>{`
        .contact-icon { transition: transform 200ms ease, box-shadow 200ms ease; }
        .contact-icon:hover { transform: translateY(-4px); box-shadow: 0 8px 18px rgba(0,0,0,0.12); }
        .contact-cv { transition: transform 200ms ease, box-shadow 200ms ease, filter 200ms ease; }
        .contact-cv:hover { transform: translateY(-3px); box-shadow: 0 10px 22px rgba(0,0,0,0.18); filter: brightness(1.08); }
        .contact-arrow { display: inline-block; transition: transform 200ms ease; }
        .contact-cv:hover .contact-arrow { transform: translate(3px, -3px); }
        @media (prefers-reduced-motion: reduce) {
          .contact-pop, .contact-head, .contact-card { transition: none !important; opacity: 1 !important; transform: none !important; }
          .contact-icon, .contact-cv, .contact-arrow { transition: none !important; }
        }
      `}</style>
      <div className="mx-auto max-w-6xl" style={{ borderTop: `1px solid ${theme.colors.newsBorder}` }}>
        <div className="pt-16">
          <div ref={headRef} className="contact-head" style={reveal(headVisible, 0, 16)}>
          <p
            className="uppercase m-0 mb-2"
            style={{
              fontFamily: theme.fonts.main,
              color: theme.colors.accent,
              fontSize: '0.85rem',
              letterSpacing: '0.25em',
            }}
          >
            Contact
          </p>
          <h2
            className="m-0 text-4xl sm:text-5xl"
            style={{ fontFamily: theme.fonts.heading, fontWeight: 400, color: theme.colors.heading }}
          >
            Get in touch
          </h2>
          </div>

          <div ref={cardsRef} className="mt-14 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
            {/* Left: contact details */}
            <div
              className="contact-card box-border"
              style={{
                ...reveal(cardsVisible, 0, 28),
                backgroundColor: '#fff',
                border: `1px solid ${theme.colors.newsBorder}`,
                borderRadius: '28px',
                padding: '40px',
              }}
            >
              <div className="flex flex-col gap-6">
                {profile.email && (
                  <Field label="Email">
                    <a href={`mailto:${profile.email}`} style={{ color: theme.colors.accent, textDecoration: 'none' }}>
                      {profile.email}
                    </a>
                  </Field>
                )}
                {profile.number && (
                  <Field label="Phone">
                    <a href={`tel:${profile.number}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {profile.number}
                    </a>
                  </Field>
                )}
                {profile.office_location && <Field label="Office">{profile.office_location}</Field>}
                {profile.department && <Field label="Department">{profile.department}</Field>}
              </div>

              {links.length > 0 && (
                <div className="flex flex-wrap gap-3.5 mt-10">
                  {links.map(({ key, label, Icon, href }, i) => (
                    <IconLink key={key} href={href} label={label} index={i} visible={cardsVisible}>
                      <Icon />
                    </IconLink>
                  ))}
                </div>
              )}
            </div>

            {/* Right: CV card */}
            <div
              className="contact-card box-border flex flex-col justify-center"
              style={{
                ...reveal(cardsVisible, 150, 28),
                backgroundColor: theme.colors.newsBg,
                border: `1px solid ${theme.colors.newsBorder}`,
                borderRadius: '28px',
                padding: '40px',
              }}
            >
              <h3
                className="m-0"
                style={{
                  fontFamily: theme.fonts.heading,
                  fontWeight: 500,
                  fontSize: '1.6rem',
                  color: theme.colors.heading,
                }}
              >
                Curriculum vitae
              </h3>
              <p
                className="m-0 mt-3"
                style={{
                  fontFamily: theme.fonts.body,
                  fontSize: '1.05rem',
                  lineHeight: 1.7,
                  color: theme.colors.body,
                  maxWidth: '24rem',
                }}
              >
                The full record — education, positions, publications, and awards.
              </p>

              {profile.cv && (
                <a
                  href={profile.cv}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-cv uppercase inline-block self-start mt-6"
                  style={{
                    fontFamily: theme.fonts.main,
                    fontSize: '0.8rem',
                    letterSpacing: '0.2em',
                    color: '#fff',
                    backgroundColor: theme.colors.accent,
                    borderRadius: '999px',
                    padding: '16px 30px',
                    textDecoration: 'none',
                  }}
                >
                  Full CV <span className="contact-arrow">↗</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;