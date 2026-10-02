// EducationCareer.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import theme from '../theme';

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

/* ---------- Start fetching as soon as this file is imported, and cache the result ---------- */
let educationPromise = null;
const fetchEducation = () => {
  if (!educationPromise) {
    educationPromise = fetch(`${API_URL}/api/education`)
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Failed to load education:', err);
        educationPromise = null; // allow retry on next mount
        return [];
      });
  }
  return educationPromise;
};
fetchEducation();

/* ---------- Reveal when scrolled into view (works even if the element mounts late) ---------- */
const useInView = (threshold = 0.05) => {
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
        // positive bottom margin = start revealing slightly BEFORE it enters the screen
        { threshold, rootMargin: '0px 0px 10% 0px' }
      );
      observerRef.current.observe(node);
    },
    [threshold]
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [ref, visible];
};

/* ---------- Date label: "PRESENT", "2024", or "2019 – 2022" ---------- */
const getDateLabel = (start = '', end = '') => {
  const s = (start || '').trim();
  const e = (end || '').trim();
  if (!e) return 'Present';
  if (!s || s === e) return e;
  return `${s} – ${e}`;
};

/* ---------- One timeline entry ---------- */
const TimelineItem = ({ item, index }) => {
  const [ref, visible] = useInView();

  const place = [item.university, item.location].filter(Boolean).join(' · ');
  const details = Array.isArray(item.subjects) ? item.subjects.filter(Boolean).join(', ') : '';

  // Items that appear together come in one after another (kept short)
  const delay = Math.min(index, 3) * 80;

  return (
    <li
      ref={ref}
      className="tl-item relative"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 400ms ease ${delay}ms, transform 400ms cubic-bezier(.2,.8,.2,1) ${delay}ms`,
      }}
    >
      <span
        className="absolute rounded-full"
        style={{
          left: '-46px',
          top: '5px',
          width: '12px',
          height: '12px',
          backgroundColor: theme.colors.accent,
        }}
      />

      <p
        className="uppercase m-0"
        style={{
          fontFamily: theme.fonts.main,
          fontSize: '0.8rem',
          letterSpacing: '0.15em',
          color: theme.colors.body,
        }}
      >
        {getDateLabel(item.start_date, item.end_date)}
      </p>

      <h3
        className="m-0 mt-2"
        style={{
          fontFamily: theme.fonts.heading,
          fontWeight: 500,
          fontSize: '1.6rem',
          lineHeight: 1.25,
          color: theme.colors.heading,
        }}
      >
        {item.heading}
      </h3>

      {place && (
        <p
          className="m-0 mt-2"
          style={{ fontFamily: theme.fonts.body, fontSize: '1.05rem', color: theme.colors.accent }}
        >
          {place}
        </p>
      )}

      {details && (
        <p
          className="m-0 mt-2"
          style={{
            fontFamily: theme.fonts.body,
            fontSize: '1.05rem',
            lineHeight: 1.7,
            color: theme.colors.body,
            maxWidth: '44rem',
          }}
        >
          {details}
        </p>
      )}
    </li>
  );
};

/* ---------- Section ---------- */
const EducationCareer = () => {
  const [items, setItems] = useState([]);
  const [headRef, headVisible] = useInView(0.1);

  useEffect(() => {
    let alive = true;
    fetchEducation().then((data) => {
      if (alive) setItems(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="w-full box-border px-6 sm:px-12 pt-8 pb-20">
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .tl-item, .tl-head { transition: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* FIX: was "mx-auto max-w-6xl" (centered + width cap = extra left space).
          Now full width, left-aligned with the sections above. */}
      <div className="mx-auto max-w-6xl">
        {/* Heading */}
        <div
          ref={headRef}
          className="tl-head"
          style={{
            opacity: headVisible ? 1 : 0,
            transform: headVisible ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 400ms ease, transform 400ms cubic-bezier(.2,.8,.2,1)',
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
            Journey
          </p>
          <h2
            className="m-0 text-4xl sm:text-5xl"
            style={{ fontFamily: theme.fonts.heading, fontWeight: 400, color: theme.colors.heading }}
          >
            Education &amp; career
          </h2>
        </div>

        {/* Timeline */}
        <ol
          className="list-none m-0 mt-14 p-0 flex flex-col gap-12"
          style={{
            marginLeft: '6px',
            paddingLeft: '40px',
            borderLeft: `1px solid ${theme.colors.newsBorder}`,
          }}
        >
          {items.map((item, i) => (
            <TimelineItem key={item.id} item={item} index={i} />
          ))}
        </ol>
      </div>
    </section>
  );
};

export default EducationCareer;