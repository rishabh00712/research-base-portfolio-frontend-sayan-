// header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import theme from '../theme';

const HIDE_DELAY = 800; // ms of no scrolling before the header comes back

const navItems = [
  { name: 'HOME', to: '/' },
  { name: 'ABOUT ME', to: '/dr-ferrocene' },
  { name: 'PEOPLE', to: '/people' },
  { name: 'RESEARCH', to: '/research' },
  { name: 'PUBLICATIONS', to: '/publications' },
  { name: 'BEYOND THE BENCH', to: '/beyond-the-bench' },
];

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [navHeight, setNavHeight] = useState(0);

  const navRef = useRef(null);
  const timerRef = useRef(null);

  // Keep a spacer the same height as the fixed header so content isn't hidden under it
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setNavHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Hide while scrolling, come back 2s after scrolling stops
  useEffect(() => {
    const onScroll = () => {
      clearTimeout(timerRef.current);

      // At the very top, or with the mobile menu open, always show it
      if (window.scrollY <= 0 || isMobileMenuOpen) {
        setVisible(true);
        return;
      }

      setVisible(false);
      timerRef.current = setTimeout(() => setVisible(true), HIDE_DELAY);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timerRef.current);
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => setIsMobileMenuOpen((open) => !open);
  const handleLinkClick = () => setIsMobileMenuOpen(false);

  return (
    <>
      <style>{`
        ::selection {
          background-color: ${theme.colors.selectionBackground};
          color: ${theme.colors.textSelection};
        }

        .site-nav {
          transition: transform 450ms cubic-bezier(.2, .8, .2, 1);
        }

        /* Text and underline always share one colour */
        .nav-link {
          color: ${theme.colors.textPrimary};
          transition: color 300ms ease;
        }
        .nav-link .nav-underline {
          position: absolute;
          left: 0;
          bottom: 0;
          height: 2px;
          width: 0;
          background-color: currentColor;
          transition: width 400ms cubic-bezier(.2, .8, .2, 1);
        }
        .nav-link:hover,
        .nav-link:focus-visible {
          color: ${theme.colors.textHover};
        }
        .nav-link:hover .nav-underline,
        .nav-link:focus-visible .nav-underline {
          width: 100%;
        }
        .nav-link.is-active {
          color: ${theme.colors.textActive};
        }
        .nav-link.is-active .nav-underline {
          width: 100%;
        }
        .nav-link:focus-visible {
          outline: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .site-nav, .nav-link, .nav-link .nav-underline { transition: none; }
        }
      `}</style>

      <nav
        ref={navRef}
        onFocus={() => setVisible(true)}
        className="site-nav fixed top-0 left-0 right-0 z-50 flex justify-end lg:justify-center items-center box-border py-6 px-12"
        style={{
          backgroundColor: theme.colors.background,
          borderBottom: `1px solid ${theme.colors.iconBorder}`,
          fontFamily: theme.fonts.main,
          transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        }}
      >
        {/* Navigation Links */}
        <ul
          className={`absolute top-full left-0 w-full flex flex-col items-center list-none m-0 overflow-hidden transition-all duration-500 ease-in-out
            lg:flex lg:flex-row lg:w-auto lg:static lg:overflow-visible lg:shadow-none lg:opacity-100 lg:visible lg:max-h-none
            gap-6 lg:gap-10 z-40
            ${isMobileMenuOpen ? 'max-h-[500px] opacity-100 visible py-8 shadow-md' : 'max-h-0 opacity-0 invisible py-0 shadow-none'}
          `}
          style={{
            backgroundColor: theme.colors.background,
          }}
        >
          {navItems.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `nav-link relative inline-block pb-1.5 uppercase no-underline${isActive ? ' is-active' : ''}`
                }
                style={{
                  fontSize: theme.fonts.size,
                  letterSpacing: theme.fonts.letterSpacing,
                }}
              >
                {item.name}
                <span className="nav-underline" />
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Hamburger Icon for Mobile */}
        <button
          className="lg:hidden flex flex-col gap-1.5 bg-transparent border-none cursor-pointer p-2.5 z-50"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation"
          aria-expanded={isMobileMenuOpen}
        >
          <div
            className="w-[26px] h-[2px] rounded-sm transition-transform duration-300 ease-in-out"
            style={{
              backgroundColor: theme.colors.textPrimary,
              transform: isMobileMenuOpen ? 'rotate(45deg) translate(6px, 6px)' : 'none',
            }}
          />
          <div
            className="w-[26px] h-[2px] rounded-sm transition-opacity duration-300 ease-in-out"
            style={{
              backgroundColor: theme.colors.textPrimary,
              opacity: isMobileMenuOpen ? '0' : '1',
            }}
          />
          <div
            className="w-[26px] h-[2px] rounded-sm transition-transform duration-300 ease-in-out"
            style={{
              backgroundColor: theme.colors.textPrimary,
              transform: isMobileMenuOpen ? 'rotate(-45deg) translate(6px, -6px)' : 'none',
            }}
          />
        </button>
      </nav>

      {/* Takes the header's place in the page flow */}
      <div aria-hidden="true" style={{ height: navHeight }} />
    </>
  );
};

export default Header;