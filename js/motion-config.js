/**
 * MOTION-CONFIG.JS — Signature Animation & Kinetic Interaction Flags
 * ÉTHÉRÉ Atelier — Grand Edition (Louvre Art Museum Template)
 * 
 * Central motion registry behind a master toggle and granular per-effect flags.
 * When master is false OR prefers-reduced-motion is active, all dynamic motion is disabled.
 */

import { isReducedMotion } from './logic.js';

export const motionConfig = {
  master: true,             // Master kill-switch: if false, zero animations run
  lenis: true,              // E0: Lenis smooth momentum scroll
  heroTypography: true,     // E3: Preloader completion, SplitText hero title & zoom
  microInteractions: true,  // E4: Magnetic luxury buttons & 3D card perspective tilt
  skeletons: true,          // E8: Fixed aspect-ratio shimmers & graceful decode fade
  selfDrawing: true,        // E6: Self-drawing SVG timeline track & milestone dots
  roomPalette: true,        // E7: Per-room dynamic CSS variable morphing
  routeTransitions: true,   // E2: GSAP Flip shared-element & soft cross-fades
  horizontalPortals: true,  // E5: Pinned horizontal scroll for chamber portals
  scrollytelling: true,     // E1: Pinned scrollytelling (Plaster Wall & Story relighting)
  cursor: false,            // Optional museum custom cursor (default: false per prompt)
  marquee: false,           // Optional section marquee strip (default: false per prompt)
};

/**
 * Check whether a specific motion effect is permitted to run
 * @param {string} [effectName]
 * @returns {boolean}
 */
export function isMotionAllowed(effectName) {
  if (typeof window === 'undefined') return false;
  // Always honor user accessibility preference first
  if (isReducedMotion()) return false;
  // Master kill-switch
  if (!motionConfig.master) return false;
  // Granular effect flag
  if (effectName && motionConfig[effectName] === false) return false;
  return true;
}

/**
 * Programmatically update motion flags (useful for settings toggles and automated test suites)
 * @param {string} flag
 * @param {boolean} value
 */
export function setMotionFlag(flag, value) {
  if (flag in motionConfig) {
    motionConfig[flag] = Boolean(value);
  }
}

/**
 * Retrieve current configuration snapshot
 * @returns {typeof motionConfig}
 */
export function getMotionConfig() {
  return { ...motionConfig };
}

// Expose on window for runtime debugging and programmatic verification
if (typeof window !== 'undefined') {
  window.__ETHÉRÉ_MOTION_CONFIG__ = motionConfig;
  window.__isMotionAllowed = isMotionAllowed;
  window.__setMotionFlag = setMotionFlag;
}
