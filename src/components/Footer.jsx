// Footer.jsx
import React, { useEffect, useState } from 'react';
import theme from '../theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/* ---------- Icons (24x24 viewBox, brand colours like the reference) ---------- */
const ScholarIcon = () => (
  <svg viewBox="0 0 24 24" fill="#4285F4" aria-hidden="true">
    <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3z" />
    <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="#356AC3" />
  </svg>
);

const InstitutionIcon = () => (
  <svg viewBox="0 0 24 24" fill={theme.colors.accent} aria-hidden="true">
    <path d="M12 2 2 7v2h20V7L12 2z" />
    <path d="M4 11h2.5v7H4zM8.5 11H11v7H8.5zM13 11h2.5v7H13zM17.5 11H20v7h-2.5zM2 19.5h20V22H2z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const OrcidIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#A6CE39" />
    <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" fontFamily="Arial, sans-serif">
      iD
    </text>
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="7" y="5" width="16" height="14" rx="2" fill="#28A8EA" />
    <path d="M8 7l7.5 5.5L23 7" fill="none" stroke="#fff" strokeWidth="1.4" />
    <rect x="1" y="7" width="12" height="12" rx="2" fill="#0F6CBD" />
    <ellipse cx="7" cy="13" rx="2.8" ry="3.2" fill="none" stroke="#fff" strokeWidth="1.6" />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill={theme.colors.heading} aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.921.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="#000" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/* SPIE: red circle with a white "S." */
const SpieIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="#E4002B" />
    <text x="11.5" y="17" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="Arial, Helvetica, sans-serif">
      S.
    </text>
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke={theme.colors.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
  </svg>
);

/* ---------- Pick an icon from the link's name (and address) in the database ---------- */
const getIcon = (name = '', link = '') => {
  const n = (name || '').toLowerCase().trim();
  const l = (link || '').toLowerCase();
  if (n.includes('spie') || l.includes('spie.org')) return SpieIcon;
  if (n.includes('scholar')) return ScholarIcon;
  if (n.includes('linkedin')) return LinkedInIcon;
  if (n.includes('orcid')) return OrcidIcon;
  if (n.includes('mail') || n.includes('outlook')) return MailIcon;
  if (n.includes('github') || l.includes('github.com')) return GitHubIcon;
  if (
    n === 'x' ||
    n.startsWith('x ') ||
    n.includes('twitter') ||
    l.includes('twitter.com') ||
    /(^|\/\/|www\.)x\.com/.test(l)
  ) {
    return XIcon;
  }
  if (n.includes('universit') || n.includes('institut') || n.includes('college') || n.includes('faculty')) {
    return InstitutionIcon;
  }
  return LinkIcon;
};

/* ---------- Turn the stored value into a proper href ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getHref = (raw = '') => {
  const link = (raw || '').trim();
  if (!link) return null;

  const plain = link.replace(/^mailto:/i, '');
  if (EMAIL_RE.test(plain.split('?')[0])) {
    return { href: `mailto:${plain}`, external: false };
  }
  const href = /^(https?:\/\/|#|\/)/i.test(link) ? link : `https://${link}`;
  return { href, external: /^https?:\/\//i.test(href) };
};

/* ---------- Footer ---------- */
const Footer = () => {
  const [name, setName] = useState('');
  const [affiliations, setAffiliations] = useState([]);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/footer`);
        const data = await res.json();
        setName(data?.name || '');
        setAffiliations(
          Array.isArray(data?.affiliations) ? data.affiliations.filter(Boolean) : []
        );
        setLinks(Array.isArray(data?.links) ? data.links : []);
      } catch (err) {
        console.error('Failed to load footer:', err);
      }
    };
    load();
  }, []);

  return (
    <footer
      className="w-full box-border"
      style={{
        backgroundColor: theme.colors.footerBg,
        borderTop: `1px solid ${theme.colors.footerBorder}`,
        padding: '56px 24px 40px',
      }}
    >
      <style>{`
        .footer-icon { display: inline-flex; width: 30px; height: 30px; transition: transform 200ms ease; }
        .footer-icon svg { width: 100%; height: 100%; display: block; }
        .footer-icon:hover { transform: translateY(-3px); }
        .footer-icon:focus-visible { outline: 2px solid ${theme.colors.accent}; outline-offset: 4px; border-radius: 4px; }
        @media (prefers-reduced-motion: reduce) { .footer-icon { transition: none; } .footer-icon:hover { transform: none; } }
      `}</style>

      <div className="mx-auto max-w-6xl flex flex-col items-center gap-6">
        {/* Affiliations: pink tags with a thin red border, centered, before the social icons */}
        {affiliations.length > 0 && (
          <ul
            aria-label="Affiliations"
            className="list-none m-0 p-0 flex flex-wrap items-center justify-center gap-3"
          >
            {affiliations.map((item) => (
              <li
                key={item}
                className="uppercase"
                style={{
                  fontFamily: theme.fonts.main,
                  fontSize: '0.75rem',
                  letterSpacing: '0.15em',
                  color: theme.colors.affilText,
                  backgroundColor: theme.colors.affilBg,
                  border: `1px solid ${theme.colors.affilBorder}`,
                  borderRadius: '999px',
                  padding: '8px 18px',
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        )}

        {links.length > 0 && (
          <nav aria-label="Social links" className="flex flex-wrap items-center justify-center gap-7">
            {links.map((item) => {
              const target = getHref(item.link);
              if (!target) return null;
              const Icon = getIcon(item.name, item.link);
              return (
                <a
                  key={item.id}
                  href={target.href}
                  {...(target.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="footer-icon"
                  aria-label={item.name}
                  title={item.name}
                >
                  <Icon />
                </a>
              );
            })}
          </nav>
        )}

        <p
          className="m-0 text-center"
          style={{
            fontFamily: theme.fonts.body,
            fontSize: '0.95rem',
            letterSpacing: '0.02em',
            color: theme.colors.body,
          }}
        >
          © {new Date().getFullYear()} {name ? `${name}. ` : ''}All rights reserved. Created by Rishabh Garai
        </p>
      </div>
    </footer>
  );
};

export default Footer;