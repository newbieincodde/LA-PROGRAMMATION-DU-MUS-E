/**
 * ROUTER.JS — Client-Side Hash Router & Information Architecture Controller
 * ÉTHÉRÉ Atelier — Grand Edition
 *
 * Implements 3-tier museum taxonomy:
 *   Room (Hub)  →  Artwork (Detail Page)  →  Story (Curatorial Essay)
 * Plus Collections, Timeline, Diptych, Curatorial, Visit and Home.
 */

import { getRoom, getArtwork, getStory, getAllArtworks } from './data.js';
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
async function updateBreadcrumbs(route) {
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
    { label: '🏛 Trang Chủ', href: '#home' }
  ];

  switch (route.name) {
    case 'room': {
      crumbs.push({ label: 'Bộ Sưu Tập', href: '#collection' });
      const room = await getRoom(route.param);
      if (room) {
        crumbs.push({ label: `Cánh ${room.numeral}: ${room.name}`, href: null });
      } else {
        crumbs.push({ label: `Cánh ${route.param}`, href: null });
      }
      break;
    }
    case 'artwork': {
      const art = await getArtwork(route.param);
      if (art) {
        crumbs.push({ label: `Cánh ${art.room}`, href: `#room/${art.room}` });
        crumbs.push({ label: art.title, href: null });
      } else {
        crumbs.push({ label: 'Tác Phẩm', href: null });
      }
      break;
    }
    case 'stories': {
      crumbs.push({ label: 'Chỉ Mục Bài Luận', href: null });
      break;
    }
    case 'story': {
      crumbs.push({ label: 'Bài Luận', href: '#stories' });
      const story = await getStory(route.param);
      if (story) {
        crumbs.push({ label: story.title, href: null });
      } else {
        crumbs.push({ label: `Bài Luận ${route.param}`, href: null });
      }
      break;
    }
    case 'collection': {
      crumbs.push({ label: 'Kho Lưu Trữ Tác Phẩm', href: null });
      break;
    }
    case 'timeline': {
      crumbs.push({ label: 'Biên Niên Sử Nghệ Thuật', href: null });
      break;
    }
    case 'diptych': {
      crumbs.push({ label: '✦ Xưởng Đối Thoại Diptych', href: null });
      break;
    }
    case 'curatorial': {
      crumbs.push({ label: 'Hội Đồng Giám Tuyển', href: null });
      break;
    }
    case 'visit': {
      crumbs.push({ label: 'Tham Quan & Đặt Vé', href: null });
      break;
    }
    default: {
      crumbs.push({ label: 'Khám Phá', href: null });
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
 * Update document.title and screen-reader route announcement
 */
async function updateDocumentMeta(route) {
  let title = 'ÉTHÉRÉ Atelier — Bảo Tàng Kỹ Thuật Số';
  let announcement = 'Đã chuyển đến: Trang Chủ Triển Lãm';

  switch (route.name) {
    case 'room': {
      const room = await getRoom(route.param);
      if (room) {
        title = `Cánh ${room.numeral}: ${room.name} — ÉTHÉRÉ Atelier`;
        announcement = `Đã chuyển đến: Cánh ${room.numeral} — ${room.name}`;
      }
      break;
    }
    case 'artwork': {
      const art = await getArtwork(route.param);
      if (art) {
        title = `${art.title} — ${art.artist} | ÉTHÉRÉ Atelier`;
        announcement = `Đã chuyển đến hồ sơ tác phẩm: ${art.title} của ${art.artist}`;
      }
      break;
    }
    case 'stories': {
      title = 'Chỉ Mục Bài Luận Giám Tuyển — ÉTHÉRÉ Atelier';
      announcement = 'Đã chuyển đến: Chỉ mục bài luận giám tuyển';
      break;
    }
    case 'story': {
      const story = await getStory(route.param);
      if (story) {
        title = `${story.title} | Bài Luận Giám Tuyển — ÉTHÉRÉ Atelier`;
        announcement = `Đã chuyển đến bài luận: ${story.title}`;
      }
      break;
    }
    case 'collection': {
      title = 'Kho Lưu Trữ Tác Phẩm — ÉTHÉRÉ Atelier';
      announcement = 'Đã chuyển đến: Kho lưu trữ tác phẩm';
      break;
    }
    case 'timeline': {
      title = 'Biên Niên Sử Nghệ Thuật — ÉTHÉRÉ Atelier';
      announcement = 'Đã chuyển đến: Biên niên sử lịch sử';
      break;
    }
    case 'diptych': {
      title = 'Xưởng Đối Thoại Diptych — ÉTHÉRÉ Atelier';
      announcement = 'Đã chuyển đến: Xưởng đối thoại Diptych';
      break;
    }
    case 'curatorial': {
      title = 'Hội Đồng Giám Tuyển — ÉTHÉRÉ Atelier';
      announcement = 'Đã chuyển đến: Lời tựa giám tuyển';
      break;
    }
    case 'visit': {
      title = 'Thông Tin Tham Quan & Đặt Vé — ÉTHÉRÉ Atelier';
      announcement = 'Đã chuyển đến: Thông tin tham quan và mua vé';
      break;
    }
  }

  document.title = title;

  const announcer = document.getElementById('route-announcer');
  if (announcer) {
    announcer.textContent = announcement;
  }
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
    applyRoomPalette(route.param || 'I');
  } else if (targetViewName === 'artwork') {
    const art = await getArtwork(route.param);
    applyRoomPalette(art && art.room ? art.room : 'I');
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
    backdrop?.classList.remove('is-open');
    btnMenu?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
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
