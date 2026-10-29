/**
 * ROUTER.JS — Client-Side Hash Router & Information Architecture Controller
 * ÉTHÉRÉ Atelier — Grand Edition
 *
 * Implements 3-tier museum taxonomy:
 *   Room (Hub)  →  Artwork (Detail Page)  →  Story (Curatorial Essay)
 * Plus Collections, Timeline, Diptych, Curatorial, Visit and Home.
 */

import { getRoom, getArtwork, getStory, getAllArtworks, normalizeRoomId } from './data.js';
import { i18n } from './i18n.js';
import {
  renderRoomView,
  renderArtworkView,
  renderStoriesIndexView,
  renderStoryView,
} from './views.js';
import {
  cleanupViewTriggers,
  initViewTriggers,
  refreshAllScrollTriggers,
  scrollToTop,
  setupSkeletonImageFade,
  applyRoomPalette,
  executeFlipToArtworkHero,
  animateViewPageTransition,
} from './animations.js';

let _activeRoute = null;
let _routeChangeListeners = [];

export function onRouteChanged(fn) {
  _routeChangeListeners.push(fn);
}

export function getCurrentRoute() {
  return _activeRoute;
}

/**
 * Parse hash into route object: { name, param, query }
 * Examples:
 *   #room/II                  => { name: 'room', param: 'II', query: {} }
 *   #artwork/rembrandt-floras => { name: 'artwork', param: 'rembrandt-floras', query: {} }
 *   #story/alchemy-shadows    => { name: 'story', param: 'alchemy-shadows', query: {} }
 *   #stories                  => { name: 'stories', param: null, query: {} }
 *   #collection?room=II&q=van => { name: 'collection', param: null, query: { room: 'II', q: 'van' } }
 *   #home / #/ / ""           => { name: 'home', param: null, query: {} }
 */
export function parseHash(hashStr) {
  let raw = (hashStr || window.location.hash || '').replace(/^#\/?/, '').trim();
  
  // Extract query string if any
  let queryString = '';
  const qIndex = raw.indexOf('?');
  if (qIndex !== -1) {
    queryString = raw.slice(qIndex + 1);
    raw = raw.slice(0, qIndex);
  }

  const query = {};
  if (queryString) {
    const params = new URLSearchParams(queryString);
    for (const [key, value] of params.entries()) {
      query[key] = value;
    }
  }

  if (!raw || raw === 'home') {
    return { name: 'home', param: null, query };
  }

  const parts = raw.split('/');
  const routeName = parts[0].toLowerCase();
  let param = parts[1] ? decodeURIComponent(parts[1]) : null;

  // Seamless alias mapping for legacy / alternate story IDs
  if (routeName === 'story' && param) {
    if (param === 'alchemy-fresco') param = 'alchemy-polychromy';
    if (param === 'alchemy-loom') param = 'alchemy-matrix';
  }

  return { name: routeName, param, query };
}

/**
 * Update dynamic breadcrumbs
 */
export async function updateBreadcrumbs(route) {
  if (!route) route = _activeRoute || { name: 'home' };
  const breadcrumbBar = document.querySelector('.museum-breadcrumbs');
  const breadcrumbInner = document.querySelector('.breadcrumbs-inner');
  if (!breadcrumbBar || !breadcrumbInner) return;

  if (route.name === 'home') {
    document.body.classList.remove('has-breadcrumbs');
    document.querySelector('.site-header')?.classList.remove('has-breadcrumbs');
    return;
  }

  document.body.classList.add('has-breadcrumbs');
  document.querySelector('.site-header')?.classList.add('has-breadcrumbs');

  let crumbs = [
    { label: `🏛 ${i18n.t('nav-home')}`, href: '#home' }
  ];

  switch (route.name) {
    case 'room': {
      crumbs.push({ label: i18n.t('nav-collection'), href: '#collection' });
      const room = await getRoom(route.param);
      const locRoom = i18n.getRoomLocalization(route.param);
      if (room && locRoom) {
        crumbs.push({ label: `${i18n.t('room-wing-label')} ${room.numeral}: ${locRoom.name}`, href: null });
      } else {
        crumbs.push({ label: `${i18n.t('room-wing-label')} ${route.param || ''}`, href: null });
      }
      break;
    }
    case 'artwork': {
      const art = await getArtwork(route.param);
      if (art) {
        crumbs.push({ label: `${i18n.t('room-wing-label')} ${art.room}`, href: `#room/${art.room}` });
        crumbs.push({ label: art.title, href: null });
      } else {
        crumbs.push({ label: i18n.tRoute('artworkFallback'), href: null });
      }
      break;
    }
    case 'stories': {
      crumbs.push({ label: i18n.tRoute('stories'), href: null });
      break;
    }
    case 'story': {
      crumbs.push({ label: i18n.t('nav-stories'), href: '#stories' });
      const locStory = i18n.getStoryLocalization(route.param);
      if (locStory) {
        crumbs.push({ label: locStory.title, href: null });
      } else {
        crumbs.push({ label: `${i18n.tRoute('storyFallback')} ${route.param || ''}`, href: null });
      }
      break;
    }
    case 'collection': {
      crumbs.push({ label: i18n.tRoute('collection'), href: null });
      break;
    }
    case 'timeline': {
      crumbs.push({ label: i18n.tRoute('timeline'), href: null });
      break;
    }
    case 'diptych': {
      crumbs.push({ label: `✦ ${i18n.tRoute('diptych')}`, href: null });
      break;
    }
    case 'curatorial': {
      crumbs.push({ label: i18n.tRoute('curatorial'), href: null });
      break;
    }
    case 'visit': {
      crumbs.push({ label: i18n.tRoute('visit'), href: null });
      break;
    }
    default: {
      crumbs.push({ label: i18n.tRoute('notFound'), href: null });
      break;
    }
  }

  breadcrumbInner.innerHTML = crumbs
    .map((c, i) => {
      if (i === crumbs.length - 1 || !c.href) {
        return `<span class="crumb-current" aria-current="page">${escapeHtmlText(c.label)}</span>`;
      }
      return `
        <a href="${c.href}" class="crumb-link" data-nav="${c.href.replace('#', '')}">${escapeHtmlText(c.label)}</a>
        <span class="crumb-sep" aria-hidden="true">/</span>
      `;
    })
    .join('');
}

function escapeHtmlText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Update document.title, Open Graph / Twitter metadata and screen-reader route announcement
 */
export async function updateDocumentMeta(route) {
  if (!route) route = _activeRoute || { name: 'home' };
  const lang = i18n.currentLang || 'vi';
  const brand = 'ÉTHÉRÉ Atelier';
  let title = `${brand} — ${i18n.tRoute('home')}`;
  let announcement = i18n.t('announcement-home', 'Đã chuyển đến: Trang Chủ Triển Lãm');
  let description = i18n.t('meta-desc-home');

  switch (route.name) {
    case 'room': {
      const room = await getRoom(route.param);
      const locRoom = i18n.getRoomLocalization(route.param);
      if (room && locRoom) {
        title = `${i18n.tRoute('roomPrefix')} ${room.numeral}: ${locRoom.name} — ${brand}`;
        announcement = `${i18n.t('announcement-room-to', 'Đã chuyển đến cánh triển lãm:')} ${i18n.tRoute('roomPrefix')} ${room.numeral} — ${locRoom.name}`;
        description = locRoom.tagline || description;
      } else {
        title = `${i18n.tRoute('roomFallback')} — ${brand}`;
        announcement = `${i18n.t('announcement-room-to', 'Đã chuyển đến:')} ${i18n.tRoute('roomFallback')}`;
      }
      break;
    }
    case 'artwork': {
      const art = await getArtwork(route.param);
      if (art) {
        title = `${art.title} — ${art.artist} | ${brand}`;
        announcement = `${i18n.t('announcement-art-to', 'Đã chuyển đến hồ sơ tác phẩm:')} ${art.title} (${art.artist})`;
        description = art.narrative ? art.narrative.slice(0, 160) : description;
      } else {
        title = `${i18n.tRoute('artworkFallback')} — ${brand}`;
        announcement = `${i18n.t('announcement-art-to', 'Đã chuyển đến:')} ${i18n.tRoute('artworkFallback')}`;
      }
      break;
    }
    case 'stories': {
      title = `${i18n.tRoute('stories')} — ${brand}`;
      announcement = `${i18n.t('announcement-to', 'Đã chuyển đến:')} ${i18n.tRoute('stories')}`;
      break;
    }
    case 'story': {
      const story = await getStory(route.param);
      const locStory = i18n.getStoryLocalization(route.param);
      if (story && locStory) {
        title = `${locStory.title} | ${i18n.tRoute('storyFallback')} — ${brand}`;
        announcement = `${i18n.t('announcement-story-to', 'Đã chuyển đến bài luận:')} ${locStory.title}`;
        description = locStory.subtitle || description;
      } else {
        title = `${i18n.tRoute('storyFallback')} — ${brand}`;
        announcement = `${i18n.t('announcement-story-to', 'Đã chuyển đến:')} ${i18n.tRoute('storyFallback')}`;
      }
      break;
    }
    case 'collection': {
      title = `${i18n.tRoute('collection')} — ${brand}`;
      announcement = `${i18n.t('announcement-to', 'Đã chuyển đến:')} ${i18n.tRoute('collection')}`;
      break;
    }
    case 'timeline': {
      title = `${i18n.tRoute('timeline')} — ${brand}`;
      announcement = `${i18n.t('announcement-to', 'Đã chuyển đến:')} ${i18n.tRoute('timeline')}`;
      break;
    }
    case 'diptych': {
      title = `${i18n.tRoute('diptych')} — ${brand}`;
      announcement = `${i18n.t('announcement-to', 'Đã chuyển đến:')} ${i18n.tRoute('diptych')}`;
      break;
    }
    case 'curatorial': {
      title = `${i18n.tRoute('curatorial')} — ${brand}`;
      announcement = `${i18n.t('announcement-to', 'Đã chuyển đến:')} ${i18n.tRoute('curatorial')}`;
      break;
    }
    case 'visit': {
      title = `${i18n.tRoute('visit')} — ${brand}`;
      announcement = `${i18n.t('announcement-to', 'Đã chuyển đến:')} ${i18n.tRoute('visit')}`;
      break;
    }
    case 'exhibition': {
      title = `${i18n.tRoute('exhibition')} — ${brand}`;
      announcement = `${i18n.t('announcement-to', 'Đã chuyển đến:')} ${i18n.tRoute('exhibition')}`;
      break;
    }
    default: {
      if (route.name && route.name !== 'home') {
        title = `${i18n.tRoute('notFound')} — ${brand}`;
        announcement = `${i18n.t('announcement-to', 'Đã chuyển đến:')} ${i18n.tRoute('notFound')}`;
      }
      break;
    }
  }

  // Assign document title safely
  document.title = title;

  // Sync Open Graph & Twitter meta tags safely
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.setAttribute('content', title);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && description) ogDesc.setAttribute('content', description);
  const twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc && description) twDesc.setAttribute('content', description);

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && description) metaDesc.setAttribute('content', description);

  // Sync locale
  const localeMap = { vi: 'vi_VN', fr: 'fr_FR', en: 'en_US' };
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale) ogLocale.setAttribute('content', localeMap[lang] || 'vi_VN');

  // Announce to screen reader
  const announcer = document.getElementById('route-announcer');
  if (announcer) {
    announcer.textContent = announcement;
  }
}

/**
 * Re-render active dynamic view when language changes
 */
export async function refreshCurrentView() {
  if (!_activeRoute) return;
  const targetViewName = _activeRoute.name;
  const targetContainer = document.getElementById(`view-${targetViewName}`);
  if (targetContainer) {
    if (targetViewName === 'room') {
      await renderRoomView(targetContainer, _activeRoute.param || 'I');
    } else if (targetViewName === 'stories') {
      await renderStoriesIndexView(targetContainer);
    } else if (targetViewName === 'story') {
      await renderStoryView(targetContainer, _activeRoute.param);
    }
  }
  await updateBreadcrumbs(_activeRoute);
  await updateDocumentMeta(_activeRoute);
}

/**
 * Core View Transition Controller
 */
export async function navigateTo(hashOrRoute, replace = false) {
  const route = typeof hashOrRoute === 'string' ? parseHash(hashOrRoute) : hashOrRoute;

  // Handle special alias route: exhibition -> open focus mode on first artwork
  if (route.name === 'exhibition') {
    if (typeof window.exitFocusMode === 'function') window.exitFocusMode();
    const all = await getAllArtworks();
    if (all && all[0] && typeof window.openFocusArtwork === 'function') {
      window.openFocusArtwork(all[0]);
    }
    return;
  }

  // Known views in the DOM
  const knownViewNames = [
    'home',
    'room',
    'artwork',
    'stories',
    'story',
    'collection',
    'timeline',
    'diptych',
    'curatorial',
    'visit',
  ];

  const targetViewName = knownViewNames.includes(route.name) ? route.name : 'home';

  // If focus mode is open, cleanly exit it
  if (typeof window.exitFocusMode === 'function') {
    window.exitFocusMode();
  }

  const previousViewName = _activeRoute ? _activeRoute.name : null;
  if (previousViewName && previousViewName !== targetViewName) {
    cleanupViewTriggers(previousViewName);
  }

  // Deactivate all views, activate target
  knownViewNames.forEach((name) => {
    const el = document.getElementById(`view-${name}`);
    if (el) {
      if (name === targetViewName) {
        el.classList.add('is-active');
      } else {
        el.classList.remove('is-active');
      }
    }
  });

  _activeRoute = { ...route, name: targetViewName };

  // Render dynamic view content
  const targetContainer = document.getElementById(`view-${targetViewName}`);
  if (targetContainer) {
    if (targetViewName === 'room') {
      await renderRoomView(targetContainer, route.param || 'I');
    } else if (targetViewName === 'artwork') {
      await renderArtworkView(targetContainer, route.param);
    } else if (targetViewName === 'stories') {
      await renderStoriesIndexView(targetContainer);
    } else if (targetViewName === 'story') {
      await renderStoryView(targetContainer, route.param);
    }
  }

  // Initialize view-specific animations & triggers
  initViewTriggers(targetViewName, targetContainer);

  // Apply skeleton loading with graceful decode fades to all images in this view
  if (targetContainer) {
    setupSkeletonImageFade(targetContainer);
  }

  // E2: Execute Flip Shared-Element or Soft Page Transition
  if (targetContainer) {
    if (targetViewName === 'artwork') {
      const heroImg = targetContainer.querySelector('.artwork-master-image');
      if (heroImg) {
        executeFlipToArtworkHero(heroImg);
      }
    } else {
      animateViewPageTransition(targetContainer);
    }
  }

  // Handle Diptych view initialization if needed
  if (targetViewName === 'diptych' && typeof window.initDiptychStudio === 'function') {
    window.initDiptychStudio();
  }

  // Handle Collection view filtering if query param given
  if (targetViewName === 'collection' && route.query && (route.query.room || route.query.q)) {
    if (route.query.room) {
      const chip = document.querySelector(`.cat-chip[data-filter="${route.query.room}"]`);
      if (chip) chip.click();
    }
    if (route.query.q) {
      const searchInput = document.getElementById('collection-search-input');
      if (searchInput) {
        searchInput.value = route.query.q;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  // Update nav active states in header & drawer
  updateNavActiveStates(targetViewName, route.param);

  // Update dynamic breadcrumbs
  await updateBreadcrumbs(_activeRoute);

  // Update Document title & aria-live announcer
  await updateDocumentMeta(_activeRoute);

  // Unified scroll to top hook (Lenis-aware)
  scrollToTop(true);

  // E7: Animate per-room dynamic color palette
  if (targetViewName === 'room') {
    applyRoomPalette(normalizeRoomId(route.param) || 'I');
  } else if (targetViewName === 'artwork') {
    const art = await getArtwork(route.param);
    applyRoomPalette(art && art.room ? normalizeRoomId(art.room) : 'I');
  } else {
    applyRoomPalette(null);
  }

  // Notify registered callbacks
  _routeChangeListeners.forEach((fn) => {
    try {
      fn(_activeRoute);
    } catch (e) {
      console.error('[Router] Listener error:', e);
    }
  });

  // Close mobile drawer if open
  closeMobileMenu();

  // Close any open navigation flyouts
  closeAllNavFlyouts();
}

/**
 * Highlight active link in header & mobile drawer
 */
function updateNavActiveStates(viewName, param) {
  // Clear all active classes
  document.querySelectorAll('.louvre-nav-item, .mobile-nav-link, .nav-flyout-item').forEach((el) => {
    el.classList.remove('active');
  });

  // Match by data-nav or exact href
  const targetNavKey = viewName === 'room' ? 'collection' : viewName;
  document.querySelectorAll(`[data-nav="${targetNavKey}"]`).forEach((el) => {
    el.classList.add('active');
  });

  if (param) {
    document.querySelectorAll(`[href="#${viewName}/${param}"]`).forEach((el) => {
      el.classList.add('active');
    });
  }
}

/**
 * Mobile Drawer close helper
 */
function closeMobileMenu() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  const btnMenu = document.getElementById('btn-mobile-menu');
  if (drawer?.classList.contains('is-open')) {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop?.classList.remove('is-open');
    btnMenu?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    btnMenu?.focus();
  }
}

/**
 * Close all navigation flyouts
 */
export function closeAllNavFlyouts() {
  document.querySelectorAll('.nav-flyout-wrapper').forEach((flyout) => {
    flyout.classList.remove('is-open');
    const trigger = flyout.querySelector('[aria-expanded]');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Initialize Single Delegated Router
 */
export function initRouter() {
  // Delegated click listener across whole document
  document.addEventListener('click', (e) => {
    // 1. Check if clicking 3D launch trigger button
    const btn3D = e.target.closest('.btn-launch-3d-relighting');
    if (btn3D) {
      e.preventDefault();
      const artId = btn3D.getAttribute('data-artwork-id');
      if (artId && typeof window.openFocusArtwork === 'function') {
        getArtwork(artId).then((art) => {
          if (art) window.openFocusArtwork(art);
        });
      }
      return;
    }

    // 2. Check if clicking flyout trigger button
    const flyoutTrigger = e.target.closest('.btn-nav-flyout-trigger');
    if (flyoutTrigger) {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = flyoutTrigger.closest('.nav-flyout-wrapper');
      if (wrapper) {
        const isOpen = wrapper.classList.contains('is-open');
        closeAllNavFlyouts();
        if (!isOpen) {
          wrapper.classList.add('is-open');
          flyoutTrigger.setAttribute('aria-expanded', 'true');
        }
      }
      return;
    }

    // 3. Check if clicking an anchor link or [data-nav]
    const link = e.target.closest('a[href^="#"], [data-nav]');
    if (link) {
      const href = link.getAttribute('href') || `#${link.getAttribute('data-nav')}`;
      if (href && href.startsWith('#')) {
        // Special case: skip-link to anchor on page
        if (href === '#main-content') return;

        e.preventDefault();
        const targetHash = href;
        if (window.location.hash !== targetHash) {
          window.history.pushState(null, '', targetHash);
        }
        navigateTo(targetHash);
        return;
      }
    }

    // 4. Clicking outside of any flyout closes all open flyouts
    if (!e.target.closest('.nav-flyout-wrapper')) {
      closeAllNavFlyouts();
    }
  });

  // Handle keyboard events (ESC closes flyouts / drawer, arrow navigation)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllNavFlyouts();
      closeMobileMenu();
    }
  });

  // Handle browser back / forward buttons
  window.addEventListener('popstate', () => {
    navigateTo(window.location.hash || '#home');
  });

  // Initial Route Load
  const initialHash = window.location.hash || '#home';
  navigateTo(initialHash, true);
}
