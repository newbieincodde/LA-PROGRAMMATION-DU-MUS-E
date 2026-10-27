/**
 * LOGIC.JS — Core Business Logic, Routing, Theme & Hardware Detection
 * Encapsulates state management, capability tests, and accessibility orchestration.
 */

import { getThemeConfig, getSiteConfig, getDefaultThemeMode } from './data.js';

/* ==========================================================================
   1. HARDWARE & GRAPHICS CAPABILITY DETECTION
   ========================================================================== */
export async function detectGraphicsCapabilities() {
  const result = {
    webgpu: false,
    webgl: false,
    mode: 'cpu', // 'webgpu' | 'webgl' | 'cpu'
  };

  // Check WebGPU support
  if (navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        result.webgpu = true;
        result.mode = 'webgpu';
        return result;
      }
    } catch (e) {
      console.warn('[Capabilities] WebGPU adapter request rejected:', e);
    }
  }

  // Fallback check WebGL2 / WebGL1
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (gl) {
      result.webgl = true;
      result.mode = 'webgl';
      return result;
    }
  } catch (e) {
    console.warn('[Capabilities] WebGL context creation failed:', e);
  }

  // Graceful fallback to CSS
  result.mode = 'cpu';
  return result;
}

export function isReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ==========================================================================
   2. THEME ENGINE (SINGLE SOURCE OF TRUTH)
   ========================================================================== */
class ThemeEngine {
  constructor() {
    this.currentMode = 'light';
    this.listeners = [];
  }

  async init() {
    const saved = localStorage.getItem('ethere_theme_mode');
    const defaultMode = await getDefaultThemeMode();
    const activeMode = saved || defaultMode;
    await this.applyTheme(activeMode, false);
  }

  async applyTheme(mode, persist = true) {
    this.currentMode = mode;
    if (persist) {
      localStorage.setItem('ethere_theme_mode', mode);
    }

    const config = await getThemeConfig(mode);
    const root = document.documentElement;

    // Apply data-theme attribute for CSS targeting
    root.setAttribute('data-theme', mode);

    if (mode === 'dark') {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
    }

    // Update CSS variables directly from JSON single source of truth
    if (config) {
      root.style.setProperty('--color-bg', config.background);
      root.style.setProperty('--color-unwoven-fade', config.background);
      root.style.setProperty('--color-text', config.text);
      root.style.setProperty('--color-muted', config.textMuted);
      root.style.setProperty('--color-surface', config.surface);
      root.style.setProperty('--color-border', config.surfaceBorder);
      root.style.setProperty('--color-accent', config.accent);

      // Update mobile browser chrome / status bar theme-color
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', config.background);
      }
    }

    // Broadcast theme change event with unwovenFadeRgb for WebGPU/WebGL shaders
    const event = new CustomEvent('themeChanged', {
      detail: {
        mode,
        background: config?.background || (mode === 'dark' ? '#0B0B0C' : '#F4F0E8'),
        unwovenFadeRgb: config?.unwovenFadeRgb || (mode === 'dark' ? [0.043, 0.043, 0.047] : [0.957, 0.941, 0.910]),
      },
    });
    window.dispatchEvent(event);
    this.listeners.forEach((fn) => fn(mode, config));
  }

  async toggle() {
    const nextMode = this.currentMode === 'light' ? 'dark' : 'light';
    await this.applyTheme(nextMode, true);
    return nextMode;
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }
}

export const themeManager = new ThemeEngine();

/* ==========================================================================
   3. SPA ROUTER WITH ACCESSIBLE ANNOUNCEMENTS
   ========================================================================== */
class SPARouter {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
    this.isNavigating = false;
  }

  init() {
    // Intercept native anchor clicks with data-link
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[data-link]');
      if (!link) return;

      const href = link.getAttribute('href');
      // If internal route
      if (href && (href.startsWith('/') || href.startsWith('#'))) {
        e.preventDefault();
        this.navigate(href);
      }
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      this.resolveCurrentPath();
    });

    // Initial resolution
    this.resolveCurrentPath();
  }

  registerRoute(pattern, handler) {
    this.routes.push({ pattern, handler });
  }

  navigate(path) {
    if (this.isNavigating) return;
    if (window.location.pathname === path) return;

    window.history.pushState(null, '', path);
    this.resolveCurrentPath();
  }

  async resolveCurrentPath() {
    const path = window.location.pathname || '/';
    let matched = null;
    let params = {};

    for (const route of this.routes) {
      if (typeof route.pattern === 'string') {
        if (route.pattern === path) {
          matched = route;
          break;
        }
      } else if (route.pattern instanceof RegExp) {
        const match = path.match(route.pattern);
        if (match) {
          matched = route;
          params = match.groups || {};
          break;
        }
      }
    }

    // Default to home if route not matched
    if (!matched) {
      matched = this.routes.find((r) => r.pattern === '/') || this.routes[0];
    }

    if (matched && matched.handler) {
      this.isNavigating = true;
      try {
        await matched.handler(params, path);
        this.currentRoute = { path, params };
      } finally {
        this.isNavigating = false;
      }
    }
  }
}

export const router = new SPARouter();

/* ==========================================================================
   4. DYNAMIC SEO & META TAG MANAGER
   ========================================================================== */
export function updateSEO({ title, description, image, ogType = 'website' }) {
  if (title) {
    document.title = title;
  }

  let descMeta = document.querySelector('meta[name="description"]');
  if (!descMeta) {
    descMeta = document.createElement('meta');
    descMeta.name = 'description';
    document.head.appendChild(descMeta);
  }
  if (description) {
    descMeta.setAttribute('content', description);
  }

  // OpenGraph tags
  const ogTags = {
    'og:title': title,
    'og:description': description,
    'og:type': ogType,
    'og:image': image || './assets/images/mother.jpg',
  };

  Object.entries(ogTags).forEach(([property, content]) => {
    if (!content) return;
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  });
}
