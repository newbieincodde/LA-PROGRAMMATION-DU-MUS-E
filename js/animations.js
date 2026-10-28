/* ==========================================================================
   ANIMATIONS.JS — Premium Kinetic & Cinematic Interactions Engine
   Louvre Grand Edition · ÉTHÉRÉ Atelier & Gallery
   
   Modules:
   - A. Cinematic Gallery Reveal (Hero SplitText & Loom Mask)
   - B. Scroll-Driven Parallax & Section ScrollTriggers (Lenis Synchronized)
   - C. Desktop Magnetic Buttons & 3D Artwork Card Perspective Hover
   - D. GSAP Flip Seamless Artwork Expansion Transition
   - E. Subtle Museum Atmosphere Dust Motes (Three.js Points)
   ========================================================================== */

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import SplitText from 'gsap/SplitText';
import Flip from 'gsap/Flip';
import Lenis from 'lenis';
import * as THREE from 'three';
import { motionConfig, isMotionAllowed } from './motion-config.js';
import { isReducedMotion } from './logic.js';

// Register GSAP Core Plugins on the shared GSAP instance
if (typeof gsap !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip);
  if (typeof window !== 'undefined') {
    window.gsap = gsap;
    window.ScrollTrigger = ScrollTrigger;
    window.SplitText = SplitText;
    window.Flip = Flip;
  }
}

// Global Animation State
let lenisInstance = null;
let activeSplitInstances = [];
let magneticElements = [];
let tiltElements = [];
let atmosphereParticleSystem = null;

// Per-view ScrollTrigger tracking to guarantee zero trigger leaks or duplicates
const viewTriggersMap = new Map();

/**
 * Register a ScrollTrigger instance to a specific view lifecycle
 */
export function registerViewTrigger(viewName, trigger) {
  if (!trigger) return;
  if (!viewTriggersMap.has(viewName)) {
    viewTriggersMap.set(viewName, []);
  }
  viewTriggersMap.get(viewName).push(trigger);
}

/**
 * Clean up all triggers associated with a view when exiting
 */
export function cleanupViewTriggers(viewName) {
  if (!viewName) return;
  if (viewTriggersMap.has(viewName)) {
    const triggers = viewTriggersMap.get(viewName);
    triggers.forEach((t) => {
      try {
        if (t && typeof t.kill === 'function') {
          t.kill(true); // revert DOM changes where appropriate
        }
      } catch (_) {}
    });
    viewTriggersMap.delete(viewName);
  }
}

/**
 * Clean up all registered view triggers
 */
export function cleanupAllViewTriggers() {
  viewTriggersMap.forEach((triggers, name) => {
    cleanupViewTriggers(name);
  });
  viewTriggersMap.clear();
}

/**
 * Safe trigger refresh after view render or image decode
 */
export function refreshAllScrollTriggers() {
  if (typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.refresh();
  }
}

/**
 * Count all active ScrollTriggers (useful for programmatic leak verification)
 */
export function getActiveScrollTriggersCount() {
  return typeof ScrollTrigger !== 'undefined' ? ScrollTrigger.getAll().length : 0;
}

if (typeof window !== 'undefined') {
  window.getActiveScrollTriggersCount = getActiveScrollTriggersCount;
  window.refreshAllScrollTriggers = refreshAllScrollTriggers;
}

/* ==========================================================================
   1. LENIS SMOOTH SCROLLING ENGINE (Synchronized with GSAP Ticker)
   ========================================================================== */
export function initSmoothScrolling() {
  if (!isMotionAllowed('lenis') || typeof Lenis === 'undefined') {
    if (lenisInstance) {
      lenisInstance.destroy();
      lenisInstance = null;
      if (typeof window !== 'undefined') window.lenis = null;
    }
    return null;
  }

  if (lenisInstance) {
    return lenisInstance;
  }

  try {
    lenisInstance = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential deceleration
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
      infinite: false,
    });

    if (typeof window !== 'undefined') {
      window.lenis = lenisInstance;
    }

    // Synchronize Lenis with ScrollTrigger
    lenisInstance.on('scroll', ScrollTrigger.update);

    // Drive Lenis from GSAP's optimized ticker loop (Zero duplicate requestAnimationFrame)
    gsap.ticker.add((time) => {
      if (lenisInstance) {
        lenisInstance.raf(time * 1000);
      }
    });

    // Disable lag smoothing to prevent scroll jumping under heavy frame budgets
    gsap.ticker.lagSmoothing(0);

    // Auto-apply data-lenis-prevent to inner scroll containers
    applyLenisPreventAttributes();

    return lenisInstance;
  } catch (err) {
    console.warn('[Motion] Lenis smooth scrolling init fallback:', err);
    return null;
  }
}

export function getLenis() {
  return lenisInstance;
}

export function applyLenisPreventAttributes() {
  if (typeof document === 'undefined') return;
  const selectors = [
    '.timeline-rail-wrap',
    '.timeline-track-wrap',
    '.circadian-milestones',
    '.category-chips',
    '.category-chips-bar',
    '.dossier-body',
    '.curatorial-drawer-body',
    '.shaders-drawer',
    '.shaders-drawer-body',
    '.nav-flyout',
    '.mobile-nav-drawer',
    '.story-sticky-pane',
    '.specs-dl',
    '#foyer-loom-wrap',
    '#foyer-carousel-stage',
  ];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.setAttribute('data-lenis-prevent', '');
    });
  });
}

/**
 * Universal scroll-to helper with Lenis / Native fallback
 */
export function scrollToTarget(target, options = {}) {
  if (lenisInstance && isMotionAllowed('lenis')) {
    lenisInstance.scrollTo(target, {
      offset: options.offset || 0,
      immediate: options.immediate || false,
      duration: options.duration || 1.1,
      easing: options.easing,
    });
  } else {
    if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: isReducedMotion() || options.immediate ? 'auto' : 'smooth' });
    } else if (typeof target === 'string') {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: isReducedMotion() || options.immediate ? 'auto' : 'smooth' });
    } else if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: isReducedMotion() || options.immediate ? 'auto' : 'smooth' });
    }
  }
}

/**
 * Unified scrollToTop hook that Lenis overrides when active
 */
export function scrollToTop(immediate = false) {
  if (lenisInstance && isMotionAllowed('lenis')) {
    lenisInstance.scrollTo(0, { immediate });
  } else if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: immediate || isReducedMotion() ? 'auto' : 'smooth' });
  }
}

if (typeof window !== 'undefined') {
  window.scrollToTop = scrollToTop;
}

/* ==========================================================================
   2. CINEMATIC GALLERY REVEAL (Hero Opening Sequence)
   ========================================================================== */
export async function runHeroReveal() {
  if (!isMotionAllowed('heroTypography')) {
    // If motion is disallowed or reduced, ensure hero elements are visible immediately
    const foyer = document.getElementById('foyer-loom-wrap');
    if (foyer) foyer.style.opacity = '1';
    return null;
  }

  // Ensure typography fonts are fully loaded before splitting to prevent layout shifts
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_) {}
  }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // 1. Reveal Continuous Ribbon Loom with cinematic clip-path mask and subtle zoom scale (1.08 -> 1.0)
  const heroLoom = document.getElementById('foyer-loom-wrap') || document.getElementById('foyer-carousel-stage');
  if (heroLoom) {
    tl.fromTo(
      heroLoom,
      {
        opacity: 0,
        scale: 1.08,
        clipPath: 'polygon(0% 12%, 100% 12%, 100% 88%, 0% 88%)',
      },
      {
        opacity: 1,
        scale: 1.0,
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        duration: 1.6,
        ease: 'power2.inOut',
      },
      0
    );
  }

  // 2. Animate Season Badge
  const seasonBadge = document.querySelector('.foyer-season-badge');
  if (seasonBadge) {
    tl.fromTo(
      seasonBadge,
      { opacity: 0, y: -14 },
      { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out' },
      0.2
    );
  }

  // 3. Animate Hero Title with SplitText (Lines + Words masked from below, NFC normalized)
  const titleEl = document.querySelector('.foyer-title');
  if (titleEl && typeof SplitText !== 'undefined') {
    try {
      if (titleEl.textContent) {
        titleEl.textContent = titleEl.textContent.normalize('NFC');
      }
      const split = new SplitText(titleEl, {
        type: 'lines,words',
        linesClass: 'split-line',
        wordsClass: 'split-word',
      });
      activeSplitInstances.push(split);

      tl.fromTo(
        split.words,
        {
          opacity: 0,
          yPercent: 100,
        },
        {
          opacity: 1,
          yPercent: 0,
          duration: 0.85,
          stagger: 0.035,
          ease: 'power3.out',
        },
        0.35
      );
    } catch (e) {
      tl.fromTo(titleEl, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9 }, 0.35);
    }
  }

  // 4. Animate Subtitle & Curatorial Lead Description
  const subTitle = document.querySelector('.foyer-subtitle-romantic');
  const leadDesc = document.querySelector('.foyer-desc');
  if (subTitle) {
    tl.fromTo(subTitle, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.75 }, 0.65);
  }
  if (leadDesc) {
    tl.fromTo(leadDesc, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.75 }, 0.8);
  }

  // 5. Animate Actions CTA Buttons & Interaction Hint
  const foyerActions = document.querySelector('.foyer-actions');
  const foyerHint = document.querySelector('.foyer-hint-bar');
  if (foyerActions) {
    tl.fromTo(foyerActions, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7 }, 0.95);
  }
  if (foyerHint) {
    tl.fromTo(foyerHint, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7 }, 1.1);
  }

  return tl;
}

/* ==========================================================================
   3. SCROLL-DRIVEN PARALLAX & SECTION REVEALS
   ========================================================================== */
export function initScrollReveals() {
  if (!isMotionAllowed()) {
    return;
  }

  // Clear previous home triggers to guarantee zero duplicates
  cleanupViewTriggers('home');

  // A. Editorial Section Headings on Home View
  const sectionHeaders = document.querySelectorAll(
    '#view-home .plaster-wall-header, #view-home .alchemy-header, #view-home .portals-header'
  );

  sectionHeaders.forEach((header) => {
    const pretitle = header.querySelector('.section-chapter-tag, .section-pretitle');
    const title = header.querySelector('h2, .plaster-wall-title, .alchemy-title, .portals-title');
    const lead = header.querySelector('p, .plaster-wall-lead, .alchemy-lead, .portals-lead');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: header,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });

    if (pretitle) {
      tl.fromTo(pretitle, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' });
    }
    if (title) {
      tl.fromTo(title, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, '-=0.35');
    }
    if (lead) {
      tl.fromTo(lead, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out' }, '-=0.45');
    }

    if (tl.scrollTrigger) {
      registerViewTrigger('home', tl.scrollTrigger);
    }
  });

  // B. Chapter II Plaster Wall Cards
  const plasterGrid = document.querySelector('.plaster-panel-grid');
  if (plasterGrid) {
    const st = ScrollTrigger.create({
      trigger: plasterGrid,
      start: 'top 85%',
      onEnter: () => {
        const cards = plasterGrid.querySelectorAll('.plaster-panel-card');
        if (cards && cards.length) {
          gsap.fromTo(
            cards,
            { opacity: 0, y: 35, scale: 0.98 },
            { opacity: 1, y: 0, scale: 1.0, duration: 0.7, stagger: 0.08, ease: 'power2.out' }
          );
        }
      },
      once: true,
    });
    registerViewTrigger('home', st);
  }

  // C. Chapter III Alchemy Essay Cards & Metrics
  const alchemyContent = document.querySelector('.alchemy-content-grid');
  if (alchemyContent) {
    const st = ScrollTrigger.create({
      trigger: alchemyContent,
      start: 'top 82%',
      onEnter: () => {
        const cards = alchemyContent.querySelectorAll('.alchemy-essay-card, .alchemy-metrics-card');
        if (cards && cards.length) {
          gsap.fromTo(
            cards,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.65, stagger: 0.07, ease: 'power2.out' }
          );
        }
      },
      once: true,
    });
    registerViewTrigger('home', st);
  }

  // D. Chapter IV Chamber Portal Cards
  const portalsGrid = document.querySelector('.chamber-portals-grid');
  if (portalsGrid) {
    const st = ScrollTrigger.create({
      trigger: portalsGrid,
      start: 'top 82%',
      onEnter: () => {
        const cards = portalsGrid.querySelectorAll('.chamber-portal-card');
        if (cards && cards.length) {
          gsap.fromTo(
            cards,
            { opacity: 0, y: 35, scale: 0.98 },
            { opacity: 1, y: 0, scale: 1.0, duration: 0.75, stagger: 0.1, ease: 'power2.out' }
          );
        }
      },
      once: true,
    });
    registerViewTrigger('home', st);
  }

  // G. Parallax Backdrops
  const parallaxBackdrops = document.querySelectorAll('.plaster-wall-backdrop, .alchemy-backdrop');
  parallaxBackdrops.forEach((backdrop) => {
    const tween = gsap.fromTo(
      backdrop,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: {
          trigger: backdrop.parentElement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2,
        },
      }
    );
    if (tween.scrollTrigger) {
      registerViewTrigger('home', tween.scrollTrigger);
    }
  });

  // H. E6 Self-Drawing SVG Section Dividers
  initSelfDrawingDividers();

  refreshAllScrollTriggers();
}

/**
 * E6 Architectural Self-Drawing SVG Section Dividers
 */
export function initSelfDrawingDividers() {
  const paths = document.querySelectorAll('.self-drawing-path');
  if (!paths || paths.length === 0) return;

  if (!isMotionAllowed('selfDrawing')) {
    paths.forEach((p) => {
      p.style.strokeDashoffset = '0';
    });
    return;
  }

  paths.forEach((path) => {
    const divider = path.closest('.section-divider-line');
    const tween = gsap.fromTo(
      path,
      { strokeDashoffset: 1 },
      {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: divider,
          start: 'top 92%',
          end: 'bottom 60%',
          scrub: 0.8,
        },
      }
    );
    if (tween.scrollTrigger) registerViewTrigger('home', tween.scrollTrigger);
  });
}

/**
 * E6 Timeline Rail Self-Drawing with Milestone Highlights
 */
export function initTimelineRailDrawing() {
  const wrap = document.querySelector('.timeline-track-wrap');
  const track = document.getElementById('timeline-track');
  if (!wrap || !track) return;

  const railPath = track.querySelector('.timeline-rail-path');
  const items = track.querySelectorAll('.timeline-item');

  if (!isMotionAllowed('selfDrawing')) {
    if (railPath) railPath.style.strokeDashoffset = '0';
    items.forEach((item) => item.classList.add('is-passed'));
    return;
  }

  // Horizontal scroll tracking to draw line
  const onScroll = () => {
    const maxScroll = wrap.scrollWidth - wrap.clientWidth;
    const progress = maxScroll > 0 ? Math.min(1, Math.max(0, wrap.scrollLeft / maxScroll)) : 1;
    if (railPath) {
      railPath.style.strokeDashoffset = (1 - progress).toFixed(3);
    }
    items.forEach((item) => {
      const itemLeft = item.offsetLeft - wrap.offsetLeft;
      if (wrap.scrollLeft + wrap.clientWidth * 0.45 >= itemLeft) {
        item.classList.add('is-passed');
      } else {
        item.classList.remove('is-passed');
      }
    });
  };

  wrap.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/**
 * Initialize dynamic triggers for secondary views (collection, room, artwork, story, etc.)
 */
export function initViewTriggers(viewName, containerEl) {
  if (!isMotionAllowed()) return;
  cleanupViewTriggers(viewName);

  if (viewName === 'home') {
    initScrollReveals();
    return;
  }

  const container = containerEl || document.getElementById(`view-${viewName}`);
  if (!container) return;

  // Animate headings
  const headers = container.querySelectorAll(
    '.room-view-header, .artwork-detail-hero, .story-view-header, .stories-masthead, .collection-masthead, .timeline-header, .curatorial-masthead, .visit-masthead'
  );
  headers.forEach((header) => {
    const title = header.querySelector('h1, h2, .room-title, .artwork-title, .story-title, .collection-title');
    const lead = header.querySelector('p, .room-tagline, .artwork-artist-origin, .story-subtitle, .collection-lead');
    if (title || lead) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: header,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      });
      if (title) tl.fromTo(title, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
      if (lead) tl.fromTo(lead, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, '-=0.3');
      if (tl.scrollTrigger) registerViewTrigger(viewName, tl.scrollTrigger);
    }
  });

  // Animate cards inside this view using ScrollTrigger batch
  const cards = container.querySelectorAll('.artwork-card, .editorial-card, .room-art-card, .story-card, .story-art-card');
  if (cards && cards.length > 0) {
    const batches = ScrollTrigger.batch(cards, {
      start: 'top 90%',
      onEnter: (batch) => {
        gsap.fromTo(
          batch,
          { opacity: 0, y: 28, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1.0, duration: 0.6, stagger: 0.05, ease: 'power2.out' }
        );
      },
      once: true,
    });
    if (Array.isArray(batches)) {
      batches.forEach((t) => registerViewTrigger(viewName, t));
    } else if (batches) {
      registerViewTrigger(viewName, batches);
    }
  }

  requestAnimationFrame(() => {
    refreshAllScrollTriggers();
  });
}

/* ==========================================================================
   4. MAGNETIC BUTTONS & 3D ARTWORK HOVER (Desktop Fine Pointer Only)
   ========================================================================== */
export function initMagneticAndHover() {
  const isFinePointer = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!isFinePointer || !isMotionAllowed('microInteractions')) {
    // If not fine pointer or motion disabled, cleanly remove any existing listeners
    magneticElements.forEach(({ btn, onMouseEnter, onMouseMove, onMouseLeave }) => {
      btn.removeEventListener('mouseenter', onMouseEnter);
      btn.removeEventListener('mousemove', onMouseMove);
      btn.removeEventListener('mouseleave', onMouseLeave);
    });
    magneticElements = [];

    tiltElements.forEach(({ card, onEnter, onMove, onLeave }) => {
      card.removeEventListener('mouseenter', onEnter);
      card.removeEventListener('mousemove', onMove);
      card.removeEventListener('mouseleave', onLeave);
    });
    tiltElements = [];
    return;
  }

  // Clean up any previous listeners
  magneticElements.forEach(({ btn, onMouseEnter, onMouseMove, onMouseLeave }) => {
    btn.removeEventListener('mouseenter', onMouseEnter);
    btn.removeEventListener('mousemove', onMouseMove);
    btn.removeEventListener('mouseleave', onMouseLeave);
  });
  magneticElements = [];

  tiltElements.forEach(({ card, onEnter, onMove, onLeave }) => {
    card.removeEventListener('mouseenter', onEnter);
    card.removeEventListener('mousemove', onMove);
    card.removeEventListener('mouseleave', onLeave);
  });
  tiltElements = [];

  // 1. Magnetic Attraction for Luxury Controls & Action Buttons (subtle 6-8px pull)
  const magnetics = document.querySelectorAll(
    '.btn-billetterie, .btn-hero-primary, .btn-hero-secondary, .theme-toggle-btn, .btn-utility-search, .btn-mobile-menu, .btn-curatorial-explore, .story-card-link'
  );

  magnetics.forEach((btn) => {
    let boundRect = null;

    const onMouseEnter = () => {
      boundRect = btn.getBoundingClientRect();
    };

    const onMouseMove = (e) => {
      if (!boundRect) boundRect = btn.getBoundingClientRect();
      const centerX = boundRect.left + boundRect.width / 2;
      const centerY = boundRect.top + boundRect.height / 2;
      const dx = (e.clientX - centerX) * 0.22;
      const dy = (e.clientY - centerY) * 0.22;

      gsap.to(btn, {
        x: Math.max(-8, Math.min(8, dx)),
        y: Math.max(-8, Math.min(8, dy)),
        duration: 0.28,
        ease: 'power2.out',
      });
    };

    const onMouseLeave = () => {
      boundRect = null;
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.55,
        ease: 'elastic.out(1, 0.45)',
      });
    };

    btn.addEventListener('mouseenter', onMouseEnter);
    btn.addEventListener('mousemove', onMouseMove);
    btn.addEventListener('mouseleave', onMouseLeave);
    magneticElements.push({ btn, onMouseEnter, onMouseMove, onMouseLeave });
  });

  // 2. Subtle 3D Card Perspective Tilt (5-6deg max) & 1.05x Micro-Zoom
  const cards = document.querySelectorAll(
    '.artwork-card, .editorial-card, .plaster-panel-card, .chamber-portal-card, .room-art-card, .story-art-card, .story-card'
  );

  cards.forEach((card) => {
    const img = card.querySelector('.card-img, .room-art-img, .story-art-img, img');
    let cardRect = null;

    const onEnter = () => {
      cardRect = card.getBoundingClientRect();
      gsap.to(card, { scale: 1.015, duration: 0.35, ease: 'power2.out' });
      if (img) gsap.to(img, { scale: 1.05, duration: 0.45, ease: 'power2.out' });
    };

    const onMove = (e) => {
      if (!cardRect) cardRect = card.getBoundingClientRect();
      const nx = (e.clientX - cardRect.left) / cardRect.width - 0.5; // [-0.5, 0.5]
      const ny = (e.clientY - cardRect.top) / cardRect.height - 0.5;

      gsap.to(card, {
        rotateY: nx * 5.5,
        rotateX: -ny * 5.5,
        transformPerspective: 950,
        duration: 0.32,
        ease: 'power1.out',
      });
    };

    const onLeave = () => {
      cardRect = null;
      gsap.to(card, {
        rotateY: 0,
        rotateX: 0,
        scale: 1.0,
        duration: 0.5,
        ease: 'power2.out',
      });
      if (img) gsap.to(img, { scale: 1.0, duration: 0.5, ease: 'power2.out' });
    };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', onLeave);
    tiltElements.push({ card, onEnter, onMove, onLeave });
  });

  // 3. Optional Museum Custom Cursor (Only when flags.cursor is true)
  if (isMotionAllowed('cursor')) {
    initCustomCursor();
  }
}

let cursorEl = null;
function initCustomCursor() {
  if (cursorEl || typeof document === 'undefined') return;
  cursorEl = document.createElement('div');
  cursorEl.className = 'museum-custom-cursor';
  cursorEl.style.cssText =
    'position:fixed;width:24px;height:24px;border:1px solid var(--color-louvre-gold, #d4af37);border-radius:50%;pointer-events:none;z-index:999999;transform:translate(-50%,-50%);transition:transform 0.12s ease-out, opacity 0.2s;opacity:0;';
  document.body.appendChild(cursorEl);

  window.addEventListener(
    'mousemove',
    (e) => {
      if (!cursorEl) return;
      cursorEl.style.opacity = '0.75';
      cursorEl.style.left = `${e.clientX}px`;
      cursorEl.style.top = `${e.clientY}px`;
    },
    { passive: true }
  );

  window.addEventListener('mouseleave', () => {
    if (cursorEl) cursorEl.style.opacity = '0';
  });
}

/* ==========================================================================
   E7 PER-ROOM COLOR PALETTES (Cinematic Atmosphere Morphing)
   ========================================================================== */
export function calculateContrastRatio(hex1, hex2) {
  function srgbToLin(c) {
    const v = c / 255.0;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  function getLuminance(hex) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
  }
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export const ROOM_PALETTES = {
  I: {
    light: { bg: '#F2EEE6', ink: '#1C1B1A', accent: '#73560F' },
    dark: { bg: '#131315', ink: '#EFECE6', accent: '#D4AF37' },
  },
  II: {
    light: { bg: '#F4EFE2', ink: '#1A1A17', accent: '#7D5A0A' },
    dark: { bg: '#141512', ink: '#F2EDE4', accent: '#DDB342' },
  },
  III: {
    light: { bg: '#EEF2F4', ink: '#14181C', accent: '#2B5E7B' },
    dark: { bg: '#101418', ink: '#E8EEF3', accent: '#73A8C6' },
  },
  IV: {
    light: { bg: '#F0EFE9', ink: '#181A16', accent: '#823D3A' },
    dark: { bg: '#151213', ink: '#EEE8E9', accent: '#D68582' },
  },
  default: {
    light: { bg: '#F4F0E8', ink: '#191816', accent: '#B38C2A' },
    dark: { bg: '#121214', ink: '#F5F0E8', accent: '#D4AF37' },
  },
};

let currentPaletteTween = null;
let currentActiveRoomId = null;

export function applyRoomPalette(roomId, immediate = false) {
  if (typeof document === 'undefined') return;
  currentActiveRoomId = roomId;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const themeKey = isDark ? 'dark' : 'light';
  const palette = ROOM_PALETTES[roomId] ? ROOM_PALETTES[roomId][themeKey] : ROOM_PALETTES.default[themeKey];

  // Dev-time WCAG AA contrast check (>= 4.5:1)
  const contrastRatio = calculateContrastRatio(palette.bg, palette.ink);
  if (contrastRatio < 4.5) {
    console.warn(`[WCAG Contrast Warning] Room ${roomId || 'default'} (${themeKey}) contrast ratio is ${contrastRatio.toFixed(2)}:1 (needs >= 4.5:1)`);
  }

  const root = document.documentElement;

  if (immediate || isReducedMotion() || !isMotionAllowed('roomPalette')) {
    if (currentPaletteTween) {
      currentPaletteTween.kill();
      currentPaletteTween = null;
    }
    root.style.setProperty('--color-bg', palette.bg);
    root.style.setProperty('--color-text', palette.ink);
    root.style.setProperty('--color-accent', palette.accent);
    root.style.setProperty('--color-louvre-gold', palette.accent);
    root.style.setProperty('--color-unwoven-fade', palette.bg);

    const clean = palette.bg.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    window.dispatchEvent(new CustomEvent('themechanged', { detail: { unwovenFadeRgb: [r, g, b] } }));
    return;
  }

  if (currentPaletteTween) {
    currentPaletteTween.kill();
  }

  const currentBg = getComputedStyle(root).getPropertyValue('--color-bg').trim() || palette.bg;
  const currentText = getComputedStyle(root).getPropertyValue('--color-text').trim() || palette.ink;
  const currentAccent = getComputedStyle(root).getPropertyValue('--color-accent').trim() || palette.accent;

  const colorProxy = {
    bg: currentBg,
    text: currentText,
    accent: currentAccent,
  };

  currentPaletteTween = gsap.to(colorProxy, {
    bg: palette.bg,
    text: palette.ink,
    accent: palette.accent,
    duration: 0.9,
    ease: 'power2.out',
    onUpdate: () => {
      root.style.setProperty('--color-bg', colorProxy.bg);
      root.style.setProperty('--color-text', colorProxy.text);
      root.style.setProperty('--color-accent', colorProxy.accent);
      root.style.setProperty('--color-louvre-gold', colorProxy.accent);
      root.style.setProperty('--color-unwoven-fade', colorProxy.bg);

      const clean = colorProxy.bg.replace('#', '');
      if (clean.length === 6) {
        const r = parseInt(clean.substring(0, 2), 16) / 255;
        const g = parseInt(clean.substring(2, 4), 16) / 255;
        const b = parseInt(clean.substring(4, 6), 16) / 255;
        window.dispatchEvent(new CustomEvent('themechanged', { detail: { unwovenFadeRgb: [r, g, b] } }));
      }
    },
    onComplete: () => {
      currentPaletteTween = null;
    },
  });
}

export function getCurrentActiveRoomId() {
  return currentActiveRoomId;
}

if (typeof window !== 'undefined') {
  window.applyRoomPalette = applyRoomPalette;
  window.calculateContrastRatio = calculateContrastRatio;
}

/* ==========================================================================
   E8 SKELETON LOADING & GRACEFUL DECODE FADES
   ========================================================================== */
export function setupSkeletonImageFade(container) {
  if (!container || typeof document === 'undefined') return;
  const allowFade = isMotionAllowed('skeletons');

  const imgs = container.querySelectorAll(
    'img.artwork-master-image, img.room-featured-img, img.room-art-thumb, img.card-img, img.story-art-img, img.chamber-portal-img, img.plaster-panel-img'
  );

  imgs.forEach((img) => {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('is-loaded');
      img.style.opacity = '1';
      return;
    }

    const parent = img.parentElement;
    if (allowFade && parent && !parent.classList.contains('skeleton-placeholder')) {
      parent.classList.add('skeleton-placeholder');
    }

    if (!allowFade || isReducedMotion()) {
      img.style.opacity = '1';
      return;
    }

    img.style.opacity = '0';
    img.style.transition = 'opacity 0.35s ease-out';

    const onReady = () => {
      img.style.opacity = '1';
      if (parent) parent.classList.remove('skeleton-placeholder');
      img.classList.add('is-loaded');
      refreshAllScrollTriggers();
    };

    if ('decode' in img) {
      img.decode().then(onReady).catch(onReady);
    } else {
      img.onload = onReady;
      img.onerror = onReady;
    }
  });
}

/* ==========================================================================
   E2 ROUTE & PAGE TRANSITIONS (GSAP Flip Shared-Element & Soft Fades)
   ========================================================================== */
let _pendingFlipState = null;
let _activeTransitionTimeline = null;

/**
 * Capture source element geometry before navigating
 */
export function setPendingFlipSource(element) {
  if (!element || !isMotionAllowed('routeTransitions')) {
    _pendingFlipState = null;
    return;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    _pendingFlipState = null;
    return;
  }
  _pendingFlipState = {
    element,
    rect: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    },
    src: element.currentSrc || element.src,
  };
}

/**
 * Execute shared-element transition from clicked card to artwork hero image
 */
export function executeFlipToArtworkHero(targetHeroImg, onComplete) {
  if (_activeTransitionTimeline) {
    _activeTransitionTimeline.kill();
    _activeTransitionTimeline = null;
  }

  if (!_pendingFlipState || !targetHeroImg || !isMotionAllowed('routeTransitions') || isReducedMotion()) {
    if (targetHeroImg) targetHeroImg.style.opacity = '1';
    if (onComplete) onComplete();
    _pendingFlipState = null;
    return;
  }

  const sourceRect = _pendingFlipState.rect;
  _pendingFlipState = null;

  let isFinished = false;
  const fallbackTimer = setTimeout(() => {
    if (!isFinished) {
      isFinished = true;
      gsap.fromTo(targetHeroImg, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' });
      if (onComplete) onComplete();
    }
  }, 600);

  const performFlip = () => {
    if (isFinished) return;
    isFinished = true;
    clearTimeout(fallbackTimer);

    const targetRect = targetHeroImg.getBoundingClientRect();
    if (sourceRect.width === 0 || targetRect.width === 0) {
      gsap.fromTo(targetHeroImg, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' });
      if (onComplete) onComplete();
      return;
    }

    const dx = sourceRect.left - targetRect.left;
    const dy = sourceRect.top - targetRect.top;
    const sx = sourceRect.width / targetRect.width;
    const sy = sourceRect.height / targetRect.height;

    _activeTransitionTimeline = gsap.timeline({
      onComplete: () => {
        _activeTransitionTimeline = null;
        if (onComplete) onComplete();
      },
    });

    _activeTransitionTimeline.fromTo(
      targetHeroImg,
      {
        x: dx,
        y: dy,
        scaleX: sx,
        scaleY: sy,
        transformOrigin: 'top left',
        opacity: 0.9,
      },
      {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        duration: 0.65,
        ease: 'power3.out',
        clearProps: 'transform',
      }
    );
  };

  if (targetHeroImg.complete && targetHeroImg.naturalWidth > 0) {
    performFlip();
  } else {
    targetHeroImg.addEventListener('load', performFlip, { once: true });
    targetHeroImg.addEventListener('error', performFlip, { once: true });
  }
}

/**
 * Soft fade & micro-elevation transition between views
 */
export function animateViewPageTransition(targetContainer, onComplete) {
  if (_activeTransitionTimeline) {
    _activeTransitionTimeline.kill();
    _activeTransitionTimeline = null;
  }

  if (!targetContainer || !isMotionAllowed('routeTransitions') || isReducedMotion()) {
    if (targetContainer) targetContainer.style.opacity = '1';
    if (onComplete) onComplete();
    return;
  }

  _activeTransitionTimeline = gsap.fromTo(
    targetContainer,
    { opacity: 0.88, y: 10 },
    {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: 'power2.out',
      clearProps: 'transform',
      onComplete: () => {
        _activeTransitionTimeline = null;
        if (onComplete) onComplete();
      },
    }
  );
}

// Backward-compatible alias for existing callers
export function animateCardExpansion(cardMediaEl, targetContainer, onComplete) {
  if (cardMediaEl) setPendingFlipSource(cardMediaEl);
  if (onComplete) onComplete();
}

/* ==========================================================================
   6. RE-SPLIT TEXT ON LANGUAGE CHANGE
   ========================================================================== */
export function revertSplitText() {
  activeSplitInstances.forEach((instance) => {
    try {
      if (instance && instance.revert) instance.revert();
    } catch (_) {}
  });
  activeSplitInstances = [];
}

export async function refreshSplitTextOnLanguageChange() {
  revertSplitText();

  if (!isMotionAllowed('heroTypography')) return;

  // Wait for font rendering to settle
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (_) {}
  }

  // Re-split foyer title with newly translated text (Lines + Words, NFC normalized)
  const titleEl = document.querySelector('.foyer-title');
  if (titleEl && typeof SplitText !== 'undefined') {
    try {
      if (titleEl.textContent) {
        titleEl.textContent = titleEl.textContent.normalize('NFC');
      }
      const split = new SplitText(titleEl, {
        type: 'lines,words',
        linesClass: 'split-line',
        wordsClass: 'split-word',
      });
      activeSplitInstances.push(split);
      gsap.fromTo(
        split.words,
        { opacity: 0, yPercent: 80 },
        { opacity: 1, yPercent: 0, duration: 0.65, stagger: 0.025, ease: 'power2.out' }
      );
    } catch (_) {}
  }

  // Refresh ScrollTrigger and re-apply reveals
  initScrollReveals();
  initMagneticAndHover();
}

/* ==========================================================================
   7. SECTION F: AMBIENT MUSEUM DUST MOTES (Subtle Three.js Points)
   ========================================================================== */
export function initAmbientDustParticles(mountEl) {
  if (isReducedMotion() || !ANIMATION_CONFIG.enableParticles || !mountEl) {
    return null;
  }

  if (atmosphereParticleSystem) {
    return atmosphereParticleSystem;
  }

  try {
    const width = mountEl.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || 480;

    // 1. Offscreen Canvas for soft circular dust alpha map
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      grad.addColorStop(0.4, 'rgba(255, 245, 230, 0.4)');
      grad.addColorStop(1, 'rgba(255, 245, 230, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);

    // 2. Restrained Dust Particles (~42 particles, subtle Brownian drift)
    const particleCount = 42;
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 40; // X spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * 24; // Y spread
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15; // Z depth
      speeds[i] = 0.003 + Math.random() * 0.006;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.45,
      map: texture,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xf5ebd9,
    });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.zIndex = '1';
    renderer.domElement.classList.add('museum-dust-canvas');

    mountEl.style.position = 'relative';
    mountEl.appendChild(renderer.domElement);

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let animId = null;
    const startTime = performance.now() * 0.001;
    let isPaused = false;

    const animateDust = () => {
      if (!isPaused) {
        const elapsedTime = performance.now() * 0.001 - startTime;
        const posAttr = geometry.attributes.position;
        const posArray = posAttr.array;

        for (let i = 0; i < particleCount; i++) {
          // Slow upward float with subtle horizontal sine swaying
          posArray[i * 3 + 1] += speeds[i];
          posArray[i * 3 + 0] += Math.sin(elapsedTime * 0.5 + phases[i]) * 0.004;

          // Wrap around top boundary
          if (posArray[i * 3 + 1] > 12) {
            posArray[i * 3 + 1] = -12;
            posArray[i * 3 + 0] = (Math.random() - 0.5) * 40;
          }
        }
        posAttr.needsUpdate = true;
        renderer.render(scene, camera);
      }
      animId = requestAnimationFrame(animateDust);
    };

    animId = requestAnimationFrame(animateDust);

    const onResize = () => {
      const w = mountEl.clientWidth || window.innerWidth;
      const h = mountEl.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    atmosphereParticleSystem = {
      destroy: () => {
        if (animId) cancelAnimationFrame(animId);
        window.removeEventListener('resize', onResize);
        if (renderer.domElement.parentElement) {
          renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
        geometry.dispose();
        material.dispose();
        texture.dispose();
        renderer.dispose();
        atmosphereParticleSystem = null;
      },
      pause: () => { isPaused = true; },
      resume: () => { isPaused = false; },
    };

    return atmosphereParticleSystem;
  } catch (err) {
    console.warn('[Atmosphere] Particles init fallback:', err);
    return null;
  }
}
