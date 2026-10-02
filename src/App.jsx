import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import theme from './theme';

// NOTE: these import names must match the file names EXACTLY (upper/lower case).
// Windows ignores case, but Linux hosts (Vercel, Netlify, etc.) do not.
import Header from './components/header';
import Home from './components/Home';
import Footer from './components/Footer';
import DrFerrocene from './components/DrFerrocene';
import PeopleMe from './components/Peopleme';
import Research from './components/Research';
import Publications from './components/Publications';
import BeyondTheBench from './components/BeyondTheBench';
import AiChatOrb from './components/AiChatOrb';
import EmojiBar from './components/EmojiBar';
import Loader from './components/Loader';

// Show the loader only on the first visit (per browser session), and only
// when the visitor lands on the home page.
const LOADER_KEY = 'loader_seen';
const shouldShowLoader = () => {
  try {
    if (window.sessionStorage.getItem(LOADER_KEY)) return false;
  } catch {
    // storage blocked: just show it
  }
  return window.location.pathname === '/';
};

// Jump to the top whenever the page changes
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Temporary page until each real one is built
const Placeholder = ({ title }) => (
  <section className="w-full box-border px-6 sm:px-12 py-16">
    <h1
      className="mx-auto max-w-6xl m-0 text-4xl sm:text-5xl"
      style={{ fontFamily: theme.fonts.heading, fontWeight: 400, color: theme.colors.heading }}
    >
      {title}
    </h1>
  </section>
);

const App = () => {
  const [loading, setLoading] = useState(shouldShowLoader);

  const handleLoaderDone = useCallback(() => {
    try {
      window.sessionStorage.setItem(LOADER_KEY, '1');
    } catch {
      // ignore storage failures
    }
    setLoading(false);
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: theme.colors.background }}
      >
        <Header />

        <main className="flex-grow" style={{ fontFamily: theme.fonts.body }}>
          <Routes>
            {/* Home renders its own hero + Explore + News */}
            <Route path="/" element={<Home />} />
            {/* DrFerrocene renders its own intro + Education/Career + Contact */}
            <Route path="/dr-ferrocene" element={<DrFerrocene />} />
            <Route path="/people" element={<PeopleMe />} />
            {/* Research renders its own cards + detail box + popups */}
            <Route path="/research" element={<Research />} />
            <Route path="/publications" element={<Publications />} />
            <Route path="/beyond-the-bench" element={<BeyondTheBench />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>

        <Footer />

        {/* Floating AI chat launcher (fixed, bottom-right on every page) */}
        <AiChatOrb />

        {/* Floating emoji reaction bar (fixed, bottom-left on every page) */}
        <EmojiBar />

        {/* First-visit loader: covers header + footer, then slides up to reveal the page */}
        {loading && <Loader onDone={handleLoaderDone} />}
      </div>
    </BrowserRouter>
  );
};

export default App;