// Explore.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import theme from '../theme';

const unsplash = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

const CARDS = [
  {
    label: 'The Group',
    title: 'People',
    text: 'Meet Me and My group members.',
    cta: 'View the group',
    to: '/people',
    image: unsplash('photo-1787058124508-091eb8a023e2'), // scientist examining a test tube
  },
  {
    label: 'The Work',
    title: 'Research',
    text: 'Optics and Photonics Instrumentation.',
    cta: 'Explore research',
    to: '/research',
    image: unsplash('photo-1761095596584-34731de3e568'), // glass beakers, dark background
  },
  {
    label: 'Papers',
    title: 'Publications',
    text: 'Optical Fibers, Meta Surface & Meta Materials and Many More…',
    cta: 'All publications',
    to: '/publications',
    image: unsplash('photo-1553328881-26ade580371e'), // Erlenmeyer flask with bokeh lights
  },
  {
    label: 'Off the clock',
    title: 'Beyond the Bench',
    text: 'Talks Milestones Blogs and Life Outside the Lab.',
    cta: 'Take a look',
    to: '/beyond-the-bench',
    image: unsplash('photo-1782902260162-ae2e48ecfc24'), // mountain trail
  },
];

/* Reveal once when scrolled into view */
const useInView = (threshold = 0.15) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
};

/* One card: outer = scroll reveal, inner = 3D tilt */
const TiltCard = ({ item, index, visible }) => {
  const cardRef = useRef(null);
  const glareRef = useRef(null);

  const handleMove = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return; // no tilt on touch
    const card = cardRef.current;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const rotateX = (0.5 - y) * 16;
    const rotateY = (x - 0.5) * 16;
    card.style.transition = 'transform 80ms ease-out, box-shadow 300ms ease';
    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03,1.03,1.03)`;
    glareRef.current.style.opacity = 1;
    glareRef.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.22), transparent 55%)`;
  };

  const handleLeave = () => {
    const card = cardRef.current;
    card.style.transition = 'transform 600ms cubic-bezier(.2,.8,.2,1), box-shadow 300ms ease';
    card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    glareRef.current.style.opacity = 0;
  };

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 700ms ease ${index * 120}ms, transform 700ms cubic-bezier(.2,.8,.2,1) ${index * 120}ms`,
      }}
    >
      <Link
        ref={cardRef}
        to={item.to}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        className="explore-card block relative no-underline"
        style={{
          borderRadius: '22px',
          minHeight: '250px',
          transformStyle: 'preserve-3d',
          boxShadow: '0 14px 30px rgba(35, 31, 32, 0.22)',
          willChange: 'transform',
        }}
      >
        {/* Background layer: photo + dark overlay + glare (clipped to rounded corners) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ borderRadius: '22px', backgroundColor: theme.colors.cardDark }}
        >
          <img
            src={item.image}
            alt=""
            loading="lazy"
            className="card-img absolute inset-0 w-full h-full"
            style={{ objectFit: 'cover' }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(35,31,32,0.88) 0%, rgba(35,31,32,0.55) 55%, rgba(35,31,32,0.3) 100%)',
            }}
          />
          <div
            ref={glareRef}
            className="absolute inset-0"
            style={{ opacity: 0, transition: 'opacity 300ms ease', pointerEvents: 'none' }}
          />
        </div>

        {/* Content layer floats above the card in 3D */}
        <div
          className="relative flex flex-col h-full box-border"
          style={{ padding: '34px', minHeight: '250px', transform: 'translateZ(45px)' }}
        >
          <p
            className="uppercase m-0"
            style={{
              fontFamily: theme.fonts.main,
              fontSize: '0.7rem',
              letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            {item.label}
          </p>

          <h3
            className="m-0 mt-2"
            style={{
              fontFamily: theme.fonts.heading,
              fontWeight: 500,
              fontSize: '1.7rem',
              color: '#fff',
              textShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}
          >
            {item.title}
          </h3>

          <p
            className="m-0 mt-3"
            style={{
              fontFamily: theme.fonts.body,
              fontSize: '1rem',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.9)',
              maxWidth: '26rem',
            }}
          >
            {item.text}
          </p>

          <span
            className="cta uppercase mt-auto pt-6 inline-flex items-center gap-2"
            style={{
              fontFamily: theme.fonts.main,
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.15em',
              color: '#fff',
            }}
          >
            {item.cta}
            <span className="arrow">→</span>
          </span>
        </div>
      </Link>
    </div>
  );
};

const Explore = () => {
  const [ref, visible] = useInView();

  return (
    <section
      ref={ref}
      className="w-full box-border px-6 sm:px-12 py-16 lg:py-20"
      style={{
        backgroundImage: `radial-gradient(${theme.colors.dot} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }}
    >
      <style>{`
        .explore-card:hover { box-shadow: 0 28px 50px rgba(35, 31, 32, 0.35); }
        .explore-card:focus-visible { outline: 3px solid ${theme.colors.accent}; outline-offset: 4px; }

        /* Photo zooms slightly on hover */
        .card-img { transition: transform 700ms cubic-bezier(.2,.8,.2,1); }
        .explore-card:hover .card-img { transform: scale(1.06); }

        /* Arrow slides on hover */
        .arrow { display: inline-block; transition: transform 300ms ease; }
        .explore-card:hover .arrow { transform: translateX(8px); }

        /* Heading underline draws in */
        .title-line { transform-origin: left; transform: scaleX(0); transition: transform 900ms cubic-bezier(.2,.8,.2,1) 300ms; }
        .in-view .title-line { transform: scaleX(1); }

        @media (prefers-reduced-motion: reduce) {
          .explore-card { transform: none !important; }
          .card-img, .explore-card:hover .card-img { transition: none; transform: none; }
        }
      `}</style>

      <div className={`mx-auto max-w-6xl ${visible ? 'in-view' : ''}`}>
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
            Explore
          </p>

          <h2
            className="inline-block m-0 relative pb-1 text-4xl sm:text-5xl"
            style={{
              fontFamily: theme.fonts.heading,
              fontWeight: 400,
              color: theme.colors.heading,
            }}
          >
            A closer look
            <span
              className="title-line absolute left-0 bottom-0 w-full"
              style={{ height: '3px', backgroundColor: theme.colors.accent }}
            />
          </h2>

          <p
            className="m-0 mt-4"
            style={{
              fontFamily: theme.fonts.body,
              color: theme.colors.body,
              fontSize: '1.1rem',
            }}
          >
            The group, the research, the papers, and life beyond the bench.
          </p>
        </div>

        {/* 2 x 2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {CARDS.map((item, i) => (
            <TiltCard key={item.title} item={item} index={i} visible={visible} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Explore;