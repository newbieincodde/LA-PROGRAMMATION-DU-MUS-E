/* ==========================================================================
   MAIN.JS — Orchestrator & Controller (Louvre Grand Edition)
   Exhibition: ÁNH SÁNG ĐI QUA THỜI GIAN (ÉTHÉRÉ Atelier & Gallery)
   Master Edition: Louvre Multi-Tier Navigation, Multi-View Pages,
   Collapsible Zen Dock, Slide-Over Curatorial Dossier & Procedural Audio
   ========================================================================== */

import {
  loadContent,
  getAllArtworks,
  getArtworkById,
  getThemeConfig,
  getLightPresets,
  getCuratorialStatement,
  getTimelineMilestones,
  searchArtworks,
  getArtworksByRoom,
  getHomeExperiences,
} from './data.js';

import { themeManager } from './logic.js';
import { RelightingStage, calculateCircadianLight } from './relighting.js';
import { UnwovenCarousel } from './unwoven.js';
import { i18n } from './i18n.js';
import {
  initSmoothScrolling,
  scrollToTarget,
  runHeroReveal,
  initScrollReveals,
  initMagneticAndHover,
  revertSplitText,
  refreshSplitTextOnLanguageChange,
  animateCardExpansion,
  initAmbientDustParticles,
  setupSkeletonImageFade,
  initTimelineRailDrawing,
  applyRoomPalette,
  getCurrentActiveRoomId,
  setPendingFlipSource,
} from './animations.js';
import { initRouter, navigateTo, getCurrentRoute } from './router.js';

// Global Application State
let allArtworksList = [];
let fullFoyerLoom = null;
let fullRelighting = null;
let currentArtworkIndex = 0;
let currentArtwork = null;
let activeView = 'home';

// Circadian 24H Solar State
let isCircadianAutoplay = false;
let circadianLoopAnimId = null;
let circadianCurrentHour = 17.5;

// Diptych Comparison Studio State
let diptychLeftStage = null;
let diptychRightStage = null;
let activeDiptychPair = 'pair-1';

const DIPTYCH_PAIRS = {
  'pair-1': {
    leftId: 'assyrian-winged-genie',
    rightId: 'wheat-field-cypresses',
    gap: '2.772',
    leftEra: '883 TCN · LƯỠNG HÀ',
    rightEra: '1889 · HẬU ẤN TƯỢNG',
    leftMedium: 'Đá thạch cao Gypsum Alabaster',
    rightMedium: 'Sơn dầu trên toan lanh (Heavy Impasto)',
    leftRelief: '~12.5 mm (Đục sâu âm bản)',
    rightRelief: '~3.2 mm (Gờ sơn đắp nổi)',
    leftMuseum: 'The Metropolitan Museum of Art',
    rightMuseum: 'The Metropolitan Museum of Art',
    title: 'Cuộc Đối Thoại Giữa Lưỡi Đục Kim Loại Và Nhát Dao Phết Sơn',
    synthesis: 'Cách nhau gần 28 thế kỷ, nhưng cả hai người nghệ sĩ đều có chung một nỗi ám ảnh: từ chối sự phẳng lặng của mặt phẳng hai chiều. Nếu người thợ điêu khắc Nimrud dùng lưỡi đục đồng khoét sâu vào thạch cao để bắt lấy ánh mặt trời sa mạc Lưỡng Hà, thì Van Gogh lại bóp trực tiếp từng tuýp sơn nguyên chất, dùng dao bay miết mạnh để tạo nên những con sóng sơn nổi cộm. Dưới cùng một ngọn đèn xiên, chúng ta nhìn thấy sự tiếp nối bất diệt của bàn tay con người trong khát khao khắc tạc cảm xúc lên vật chất.'
  },
  'pair-2': {
    leftId: 'unicorn-in-captivity',
    rightId: 'hokusai-great-wave',
    gap: '336',
    leftEra: '1495 · PHỤC HƯNG XỨ FLANDERS',
    rightEra: '1831 · THỜI KỲ EDO NHẬT BẢN',
    leftMedium: 'Len dệt, tơ tằm & sợi kim loại dát vàng',
    rightMedium: 'Mộc bản khắc gỗ đa sắc (Ukiyo-e) trên giấy Washi',
    leftRelief: '~1.8 mm (Thớ dệt hữu cơ)',
    rightRelief: '~0.6 mm (Vết khắc mộc bản)',
    leftMuseum: 'The Met Cloisters',
    rightMuseum: 'The Metropolitan Museum of Art',
    title: 'Vũ Điệu Của Sợi Len Dệt Phương Tây & Thớ Giấy Dâu Tằm Phương Đông',
    synthesis: 'Hai nền văn minh cách nhau nửa vòng trái đất cùng tìm thấy đỉnh cao của sự tinh xảo thông qua vật liệu tự nhiên. Những nghệ nhân dệt xứ Flanders thế kỷ 15 dùng sợi len thô và chỉ tơ vàng đan cài hàng triệu điểm chạm để giam cầm sinh vật huyền bí; trong khi Hokusai tại Edo dùng khối gỗ anh đào ép mực chàm Phổ lên từng thớ giấy washi dâu tằm. Ánh sáng xiên phơi bày chiều sâu vi mô của hai thế giới xúc giác độc bản.'
  },
  'pair-3': {
    leftId: 'roman-dancing-maenad',
    rightId: 'rembrandt-aristotle',
    gap: '1.703',
    leftEra: '50 TCN · LA MÃ CỔ ĐẠI',
    rightEra: '1653 · THỜI KỲ HOÀNG KIM HÀ LAN',
    leftMedium: 'Bích họa vôi vữa cổ (Fresco on plaster)',
    rightMedium: 'Sơn dầu tráng men Chiaroscuro nhiều lớp',
    leftRelief: '~4.5 mm (Vết nứt vôi vữa)',
    rightRelief: '~2.1 mm (Lớp véc-ni bóng)',
    leftMuseum: 'The Metropolitan Museum of Art',
    rightMuseum: 'The Metropolitan Museum of Art',
    title: 'Bí Ẩn Của Bóng Tối Chiaroscuro Qua 1.700 Năm',
    synthesis: 'Từ bức tường bích họa đá vôi thành Boscoreale bị vùi lấp dưới tro bụi núi lửa Vesuvius đến cây cọ vàng nâu sẫm của Rembrandt tại Amsterdam. Cả hai kiệt tác đều không dùng ánh sáng để chiếu rọi tất cả, mà dùng bóng tối để che giấu những điều thiêng liêng nhất. Khi ngọn đèn lướt qua, lớp vôi vữa La Mã và lớp sơn dầu Hà Lan cùng bừng sáng một vẻ đẹp u uẩn vượt thời gian.'
  }
};

// Procedural Audio Synthesizer State
let audioCtx = null;
let audioGain = null;
let isAudioPlaying = false;

// Torchlight coordinates
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let torchX = mouseX;
let torchY = mouseY;

/* ==========================================================================
   1. PROCEDURAL MUSEUM AUDIO GUIDE (Web Audio API Synthesizer)
   ========================================================================== */
function initAudioGuide() {
  const btnAudio = document.getElementById('btn-toggle-audio');
  const iconAudio = document.getElementById('audio-icon');

  const toggleSoundscape = () => {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      // Create warm ambient meditative drone
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      audioGain = audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(108, audioCtx.currentTime); // 108Hz harmonic base
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(162, audioCtx.currentTime); // Perfect fifth harmonic

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, audioCtx.currentTime);

      audioGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(audioGain);
      audioGain.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    isAudioPlaying = !isAudioPlaying;

    if (isAudioPlaying) {
      audioGain.gain.cancelScheduledValues(audioCtx.currentTime);
      audioGain.gain.setTargetAtTime(0.045, audioCtx.currentTime, 1.2);
      btnAudio?.classList.add('is-playing');
      if (iconAudio) iconAudio.textContent = '🔊';
    } else {
      audioGain.gain.cancelScheduledValues(audioCtx.currentTime);
      audioGain.gain.setTargetAtTime(0.00001, audioCtx.currentTime, 0.8);
      btnAudio?.classList.remove('is-playing');
      if (iconAudio) iconAudio.textContent = '♫';
    }
  };

  btnAudio?.addEventListener('click', toggleSoundscape);
}

/* ==========================================================================
   2. FOCUS 3D RELIGHTING ZEN MODE STAGE (Collapsible Dock & Dossier)
   ========================================================================== */
export async function openFocusArtwork(artworkInput) {
  if (typeof window !== 'undefined') window.openFocusArtwork = openFocusArtwork;
  let artwork = artworkInput;
  if (typeof artworkInput === 'string') {
    artwork = await getArtworkById(artworkInput);
  }
  if (!artwork) return;

  currentArtwork = artwork;
  currentArtworkIndex = allArtworksList.findIndex((a) => a.id === artwork.id);
  if (currentArtworkIndex === -1) currentArtworkIndex = 0;

  const exhibitionStage = document.getElementById('exhibition');
  const relightingMount = document.getElementById('focus-relighting-stage');
  const torch = document.getElementById('torch-spotlight');

  // Reveal Zen Stage & activate torch spotlight
  exhibitionStage?.classList.add('is-active');
  if (torch) torch.style.display = 'block';

  // Ensure Dock is in initial ready state
  const dock = document.getElementById('zen-bottom-dock');
  const btnShow = document.getElementById('btn-show-dock');
  dock?.classList.remove('is-collapsed');
  btnShow?.classList.remove('is-visible');

  // Ensure Breadcrumbs indicate 3D focus
  const crumbDept = document.getElementById('crumb-dept');
  const crumbTitle = document.getElementById('crumb-title');
  if (crumbDept) crumbDept.textContent = 'Triển Lãm 3D';
  if (crumbTitle) crumbTitle.textContent = artwork.title;

  // Update Zen Room Badge
  const roomBadge = document.getElementById('zen-room-badge');
  if (roomBadge) {
    roomBadge.textContent = artwork.roomName ? `Phòng ${artwork.roomName}` : 'Phòng Triển Lãm 3D';
  }

  // Update Minimal Architectural Bottom Dock
  const dockDept = document.getElementById('zen-dock-dept');
  const dockTitle = document.getElementById('zen-dock-title');
  const dockMeta = document.getElementById('zen-dock-meta');

  if (dockDept) dockDept.textContent = `${artwork.roomName || 'PHÒNG TRIỂN LÃM'} · ${artwork.year || ''}`;
  if (dockTitle) dockTitle.textContent = artwork.title || '';

  const specs = Array.isArray(artwork.specs) ? artwork.specs : [];
  const mediumSpec = specs.find((s) => s.label?.toLowerCase().includes('chất liệu'))?.value || artwork.specs?.medium || '';
  const dimsSpec = specs.find((s) => s.label?.toLowerCase().includes('kích thước'))?.value || artwork.specs?.dimensions || '';

  if (dockMeta) {
    dockMeta.textContent = [artwork.artist, mediumSpec, dimsSpec].filter(Boolean).join(' · ');
  }

  // Pre-populate Curatorial Dossier Drawer
  populateDossierDrawer(artwork);

  // Re-create Relighting Stage with optimal lighting preset for medium
  if (fullRelighting) {
    fullRelighting.destroy();
  }

  let presetOptions = {
    lightColor: '#ff9e59',
    intensity: 0.54,
    elevation: 0.95,
  };

  if (artwork.room === 'I') {
    presetOptions = { lightColor: '#f6eedf', intensity: 0.52, elevation: 1.0 };
  } else if (artwork.room === 'II') {
    presetOptions = { lightColor: '#ff9e59', intensity: 0.55, elevation: 0.85 };
  } else if (artwork.room === 'III') {
    presetOptions = { lightColor: '#ffffff', intensity: 0.48, elevation: 1.3 };
  } else if (artwork.room === 'IV') {
    presetOptions = { lightColor: '#f6eedf', intensity: 0.50, elevation: 1.1 };
  }

  if (relightingMount) {
    fullRelighting = new RelightingStage(relightingMount, artwork, presetOptions);
    await fullRelighting.init();
    // Apply active circadian time
    fullRelighting.setCircadianHour(circadianCurrentHour, false);
  }
}

export function exitFocusMode() {
  const exhibitionStage = document.getElementById('exhibition');
  const torch = document.getElementById('torch-spotlight');

  exhibitionStage?.classList.remove('is-active');
  if (torch) torch.style.display = 'none';

  const dock = document.getElementById('zen-bottom-dock');
  const btnShow = document.getElementById('btn-show-dock');
  dock?.classList.remove('is-collapsed');
  btnShow?.classList.remove('is-visible');

  if (fullRelighting) {
    fullRelighting.destroy();
    fullRelighting = null;
  }
}

export function navigateArtworkStep(step) {
  if (!allArtworksList.length) return;
  const count = allArtworksList.length;
  currentArtworkIndex = (currentArtworkIndex + step + count) % count;
  openFocusArtwork(allArtworksList[currentArtworkIndex]);
}

/* ==========================================================================
   3. COLLAPSIBLE BOTTOM DOCK IN 3D ZEN MODE
   ========================================================================== */
function setupZenDockCollapse() {
  const dock = document.getElementById('zen-bottom-dock');
  const btnCollapse = document.getElementById('btn-dock-collapse');
  const btnShow = document.getElementById('btn-show-dock');

  btnCollapse?.addEventListener('click', () => {
    dock?.classList.add('is-collapsed');
    btnShow?.classList.add('is-visible');
  });

  btnShow?.addEventListener('click', () => {
    dock?.classList.remove('is-collapsed');
    btnShow?.classList.remove('is-visible');
  });
}

/* ==========================================================================
   4. CURATORIAL DOSSIER DRAWER LOGIC
   ========================================================================== */
function populateDossierDrawer(artwork) {
  const badge = document.getElementById('dossier-badge');
  const title = document.getElementById('dossier-title');
  const artistDate = document.getElementById('dossier-artist-date');
  const narrative = document.getElementById('dossier-narrative');
  const technique = document.getElementById('dossier-technique');
  const specsBody = document.getElementById('dossier-specs-body');
  const museumLink = document.getElementById('dossier-museum-link');

  if (badge) badge.textContent = `HỒ SƠ BẢO TÀNG CHUYÊN SÂU · ${artwork.roomName || 'KIỆT TÁC'}`;
  if (title) title.textContent = artwork.title || '';
  if (artistDate) artistDate.textContent = `${artwork.artist || ''} · ${artwork.year || ''}`;
  if (narrative) narrative.textContent = artwork.narrative || 'Hiện vật được số hóa độ phân giải cao phục vụ nghiên cứu bảo tồn nghệ thuật xúc giác.';
  if (technique) technique.textContent = artwork.technique || 'Kỹ thuật tạo tác truyền thống được tái hiện bằng công nghệ chiếu sáng 3D.';

  if (specsBody && artwork.specs) {
    const specsList = Array.isArray(artwork.specs)
      ? artwork.specs
      : Object.entries(artwork.specs).map(([k, v]) => ({ label: k, value: v }));

    specsBody.innerHTML = specsList
      .map(
        (s) => `
        <tr>
          <td>${s.label || ''}</td>
          <td>${s.value || ''}</td>
        </tr>
      `
      )
      .join('');
  }

  if (museumLink) {
    if (artwork.source?.searchUrl) {
      museumLink.href = artwork.source.searchUrl;
      const musName = (artwork.source.museum || 'Bảo tàng').split('(')[0].trim();
      museumLink.textContent = `Xem Bản Gốc Tại ${musName} ↗`;
      museumLink.style.display = 'inline-flex';
    } else {
      museumLink.style.display = 'none';
    }
  }
}

function setupDossierDrawer() {
  const btnOpen = document.getElementById('btn-open-dossier');
  const btnClose = document.getElementById('btn-close-dossier');
  const drawer = document.getElementById('artwork-dossier-drawer');
  const backdrop = document.getElementById('dossier-drawer-backdrop');

  const openDrawer = () => {
    if (currentArtwork) populateDossierDrawer(currentArtwork);
    drawer?.classList.add('is-open');
    backdrop?.classList.add('is-open');
  };

  const closeDrawer = () => {
    drawer?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
  };

  btnOpen?.addEventListener('click', openDrawer);
  btnClose?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);
}

/* ==========================================================================
   5. QUICK SEARCH MODAL (Triggered by Top Search Button or '/')
   ========================================================================== */
function setupSearchModal() {
  const btnOpen = document.getElementById('btn-utility-search');
  const btnClose = document.getElementById('btn-close-search-modal');
  const modal = document.getElementById('search-modal-backdrop');
  const input = document.getElementById('modal-search-input');
  const resultsContainer = document.getElementById('modal-search-results');

  const openModal = () => {
    modal?.classList.add('is-open');
    input?.focus();
    renderSearchResults(allArtworksList.slice(0, 6));
  };

  const closeModal = () => {
    modal?.classList.remove('is-open');
    if (input) input.value = '';
  };

  btnOpen?.addEventListener('click', openModal);
  btnClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const renderSearchResults = (list) => {
    if (!resultsContainer) return;
    if (!list.length) {
      resultsContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--color-muted); font-size: 0.88rem;">
          Không tìm thấy tác phẩm nào phù hợp.
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = list
      .map(
        (art) => `
        <div class="search-result-item" data-art-id="${art.id}">
          <img src="${art.image}" alt="${art.title}" class="search-result-thumb" loading="lazy" />
          <div class="search-result-info">
            <span class="search-result-title">${art.title}</span>
            <span class="search-result-meta">${art.artist || ''} · ${art.year || ''}</span>
          </div>
        </div>
      `
      )
      .join('');

    resultsContainer.querySelectorAll('.search-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const artId = item.getAttribute('data-art-id');
        closeModal();
        openFocusArtwork(artId);
      });
    });
  };

  input?.addEventListener('input', async (e) => {
    const q = e.target.value.trim();
    if (!q) {
      renderSearchResults(allArtworksList.slice(0, 6));
      return;
    }
    const filtered = await searchArtworks(q);
    renderSearchResults(filtered);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      openModal();
    }
  });
}

/* ==========================================================================
   6. BREADCRUMBS & MULTI-VIEW SPA PAGE ROUTER
   ========================================================================== */
export function switchView(viewName) {
  navigateTo(viewName);
}

function setupNavigationRouting() {
  // Mobile Navigation Drawer Controller
  setupMobileNavigation();

  // Hero enter button
  document.getElementById('btn-hero-enter-3d')?.addEventListener('click', () => {
    openFocusArtwork(allArtworksList[0]);
  });

  // Initialize unified delegated router
  initRouter();
}

function setupMobileNavigation() {
  const btnMobileMenu = document.getElementById('btn-mobile-menu');
  const btnCloseMobileMenu = document.getElementById('btn-close-mobile-menu');
  const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
  const mobileNavBackdrop = document.getElementById('mobile-nav-backdrop');
  const themeToggleMob = document.getElementById('theme-toggle-btn-mob');
  const btnMobileShaders = document.getElementById('btn-mobile-shaders');
  const btnMobileSearch = document.getElementById('btn-mobile-search');

  function openMobileNav() {
    mobileNavDrawer?.classList.add('is-open');
    mobileNavBackdrop?.classList.add('is-open');
    btnMobileMenu?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    btnCloseMobileMenu?.focus();
  }

  function closeMobileNav() {
    mobileNavDrawer?.classList.remove('is-open');
    mobileNavBackdrop?.classList.remove('is-open');
    btnMobileMenu?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  btnMobileMenu?.addEventListener('click', () => {
    if (mobileNavDrawer?.classList.contains('is-open')) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  });

  btnCloseMobileMenu?.addEventListener('click', closeMobileNav);
  mobileNavBackdrop?.addEventListener('click', closeMobileNav);

  // Sync mobile theme button with main theme switcher
  themeToggleMob?.addEventListener('click', () => {
    document.getElementById('theme-toggle-btn')?.click();
  });

  // Mobile secondary shortcuts
  btnMobileShaders?.addEventListener('click', () => {
    closeMobileNav();
    setTimeout(() => {
      document.getElementById('btn-open-shaders')?.click();
    }, 200);
  });

  btnMobileSearch?.addEventListener('click', () => {
    closeMobileNav();
    setTimeout(() => {
      document.getElementById('btn-utility-search')?.click();
    }, 200);
  });
}

/* ==========================================================================
   7. POPULATE EDITORIAL COLLECTION GRID & REAL-TIME SEARCH
   ========================================================================== */
function renderCollectionCards(artworks) {
  const grid = document.getElementById('editorial-grid');
  if (!grid) return;

  if (!artworks.length) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--color-muted);">
        Không tìm thấy tác phẩm nào khớp với từ khóa của bạn.
      </div>
    `;
    return;
  }

  grid.innerHTML = artworks
    .map((art) => {
      const specs = Array.isArray(art.specs) ? art.specs : [];
      const mediumSpec = specs.find((s) => s.label?.toLowerCase().includes('chất liệu'))?.value || art.specs?.medium || '';

      return `
      <article class="artwork-card" data-art-id="${art.id}" tabindex="0" role="button" aria-label="Xem hồ sơ chi tiết ${art.title}">
        <div class="card-media">
          <img src="${art.image}" alt="${art.alt || art.title}" class="card-img" loading="lazy" />
          <span class="card-room-badge">${art.roomName || 'Cánh Triển Lãm'}</span>
        </div>
        <div class="card-details">
          <span class="card-meta-line">${art.category || 'MỸ THUẬT'}</span>
          <h3 class="card-title">${art.title}</h3>
          <span class="card-artist-year">${art.artist || ''} · ${art.year || ''}</span>
          ${mediumSpec ? `<span style="font-size:0.72rem; color:var(--color-muted); margin-top:2px;">${mediumSpec}</span>` : ''}
          <div class="card-actions-quick" style="display:flex; gap:8px; margin-top:12px;">
            <a href="#artwork/${art.id}" class="btn-card-inspect" style="text-decoration:none;">Hồ Sơ</a>
            <button type="button" class="btn-card-3d btn-launch-3d-relighting" data-artwork-id="${art.id}">✦ 3D</button>
          </div>
        </div>
      </article>
    `;
    })
    .join('');

  grid.querySelectorAll('.artwork-card').forEach((card) => {
    const artId = card.getAttribute('data-art-id');
    const handler = (e) => {
      // If clicking directly on 3D trigger or link, let delegated listeners handle it
      if (e?.target?.closest('.btn-launch-3d-relighting, a')) return;
      navigateTo(`#artwork/${artId}`);
    };
    card.addEventListener('click', handler);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateTo(`#artwork/${artId}`);
      }
    });
  });

  // Apply skeleton loading shimmers with graceful decode fade
  setupSkeletonImageFade(grid);

  // Re-bind 3D tilt & magnetic interactions on rendered collection cards
  initMagneticAndHover();
}

function setupCollectionControls() {
  const chips = document.querySelectorAll('.cat-chip');
  const searchInput = document.getElementById('collection-search-input');

  let activeRoom = 'all';

  const updateGrid = async () => {
    const query = searchInput?.value.trim() || '';
    let filtered = allArtworksList;

    if (activeRoom !== 'all') {
      filtered = await getArtworksByRoom(activeRoom);
    }

    if (query) {
      filtered = filtered.filter((art) => {
        const text = `${art.title} ${art.artist} ${art.category} ${art.technique} ${art.narrative}`.toLowerCase();
        return text.includes(query.toLowerCase());
      });
    }

    renderCollectionCards(filtered);
  };

  chips.forEach((chip) => {
    chip.addEventListener('click', async (e) => {
      chips.forEach((c) => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeRoom = e.currentTarget.getAttribute('data-filter') || 'all';
      await updateGrid();
    });
  });

  searchInput?.addEventListener('input', updateGrid);
  renderCollectionCards(allArtworksList);
}

/* ==========================================================================
   8. POPULATE HISTORICAL TIMELINE
   ========================================================================== */
async function populateTimeline() {
  const track = document.getElementById('timeline-track');
  const milestones = await getTimelineMilestones();

  if (track && milestones.length) {
    const railSvg = `
      <svg class="timeline-svg-rail" viewBox="0 0 1000 4" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="2" x2="1000" y2="2" stroke="var(--color-louvre-gold, #d4af37)" stroke-width="2" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" class="timeline-rail-path" />
      </svg>
    `;

    track.innerHTML = railSvg + milestones
      .map(
        (m) => `
        <div class="timeline-item" data-art-id="${m.artworkId}" tabindex="0" role="button" aria-label="Thời kỳ ${m.year}: ${m.title}">
          <div class="timeline-node"></div>
          <span class="timeline-year">${m.year}</span>
          <span class="timeline-era">${m.era}</span>
          <span class="timeline-card-title">${m.title}</span>
        </div>
      `
      )
      .join('');

    track.querySelectorAll('.timeline-item').forEach((item) => {
      const artId = item.getAttribute('data-art-id');
      const handler = () => openFocusArtwork(artId);
      item.addEventListener('click', handler);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    });

    initTimelineRailDrawing();
  }
}

/* ==========================================================================
   9. POPULATE CURATORIAL ESSAY
   ========================================================================== */
async function populateCuratorialSection() {
  const essayContainer = document.getElementById('curatorial-essay-paragraphs');
  const statement = await getCuratorialStatement();

  if (essayContainer && statement?.paragraphs) {
    essayContainer.innerHTML = statement.paragraphs
      .map((p) => `<p>${p}</p>`)
      .join('');
  }
}

/* ==========================================================================
   FEATURE 1: 24-HOUR CIRCADIAN SOLAR SIMULATION CONTROLLER
   ========================================================================== */
function setupCircadianControl() {
  const slider = document.getElementById('circadian-slider');
  const readout = document.getElementById('circadian-time-display');
  const btnAutoplay = document.getElementById('btn-circadian-autoplay');
  const chips = document.querySelectorAll('.circadian-chip');

  const updateCircadian = (hourFloat, animate = false) => {
    circadianCurrentHour = parseFloat(hourFloat);
    if (slider) slider.value = circadianCurrentHour;

    if (fullRelighting) {
      const data = fullRelighting.setCircadianHour(circadianCurrentHour, animate);
      if (readout) {
        readout.textContent = `${data.icon} ${data.label}`;
      }
    } else {
      const data = calculateCircadianLight(circadianCurrentHour);
      if (readout) {
        readout.textContent = `${data.icon} ${data.label}`;
      }
    }

    chips.forEach((c) => {
      const ch = parseFloat(c.getAttribute('data-hour'));
      if (Math.abs(ch - circadianCurrentHour) < 1.0) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });
  };

  slider?.addEventListener('input', (e) => {
    if (isCircadianAutoplay) stopAutoplay();
    updateCircadian(e.target.value, false);
  });

  chips.forEach((chip) => {
    chip.addEventListener('click', (e) => {
      if (isCircadianAutoplay) stopAutoplay();
      const h = parseFloat(e.currentTarget.getAttribute('data-hour'));
      updateCircadian(h, true);
    });
  });

  const stopAutoplay = () => {
    isCircadianAutoplay = false;
    btnAutoplay?.classList.remove('is-playing');
    const playIcon = document.getElementById('circadian-play-icon');
    if (playIcon) playIcon.textContent = '▶';
    if (circadianLoopAnimId) {
      cancelAnimationFrame(circadianLoopAnimId);
      circadianLoopAnimId = null;
    }
  };

  const startAutoplay = () => {
    isCircadianAutoplay = true;
    btnAutoplay?.classList.add('is-playing');
    const playIcon = document.getElementById('circadian-play-icon');
    if (playIcon) playIcon.textContent = '❚❚';

    let lastTime = performance.now();
    const loop = (now) => {
      if (!isCircadianAutoplay) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Advance 24 hours over 24 seconds (1 hr/sec)
      circadianCurrentHour = (circadianCurrentHour + dt * 1.0) % 24;
      updateCircadian(circadianCurrentHour, false);

      circadianLoopAnimId = requestAnimationFrame(loop);
    };
    circadianLoopAnimId = requestAnimationFrame(loop);
  };

  btnAutoplay?.addEventListener('click', () => {
    if (isCircadianAutoplay) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  updateCircadian(17.5, false);
}

/* ==========================================================================
   FEATURE 2: CURATORIAL DIPTYCH COMPARISON STUDIO
   ========================================================================== */
async function initDiptychStudio() {
  const leftMount = document.getElementById('diptych-canvas-left');
  const rightMount = document.getElementById('diptych-canvas-right');
  const stageContainer = document.getElementById('diptych-stage-container');

  if (!leftMount || !rightMount) return;

  const pairData = DIPTYCH_PAIRS[activeDiptychPair] || DIPTYCH_PAIRS['pair-1'];
  const leftArt = await getArtworkById(pairData.leftId);
  const rightArt = await getArtworkById(pairData.rightId);

  // Update DOM overlays & texts
  const leftEra = document.getElementById('diptych-left-era');
  const leftTitle = document.getElementById('diptych-left-title');
  const rightEra = document.getElementById('diptych-right-era');
  const rightTitle = document.getElementById('diptych-right-title');
  const gapBadge = document.getElementById('diptych-gap-badge');

  if (leftEra) leftEra.textContent = pairData.leftEra;
  if (leftTitle) leftTitle.textContent = leftArt?.title || '';
  if (rightEra) rightEra.textContent = pairData.rightEra;
  if (rightTitle) rightTitle.textContent = rightArt?.title || '';
  if (gapBadge) {
    const gapNum = gapBadge.querySelector('.gap-number');
    if (gapNum) gapNum.textContent = pairData.gap;
  }

  // Update Meta
  const leftMetaEl = document.getElementById('diptych-left-meta');
  if (leftMetaEl) {
    leftMetaEl.innerHTML = `
      <div class="meta-row"><span class="meta-lbl">Chất liệu:</span> <span class="meta-val">${pairData.leftMedium}</span></div>
      <div class="meta-row"><span class="meta-lbl">Độ sâu địa hình:</span> <span class="meta-val highlight-val">${pairData.leftRelief}</span></div>
      <div class="meta-row"><span class="meta-lbl">Bảo tàng lưu giữ:</span> <span class="meta-val">${pairData.leftMuseum}</span></div>
    `;
  }

  const rightMetaEl = document.getElementById('diptych-right-meta');
  if (rightMetaEl) {
    rightMetaEl.innerHTML = `
      <div class="meta-row"><span class="meta-lbl">Chất liệu:</span> <span class="meta-val">${pairData.rightMedium}</span></div>
      <div class="meta-row"><span class="meta-lbl">Độ sâu địa hình:</span> <span class="meta-val highlight-val">${pairData.rightRelief}</span></div>
      <div class="meta-row"><span class="meta-lbl">Bảo tàng lưu giữ:</span> <span class="meta-val">${pairData.rightMuseum}</span></div>
    `;
  }

  // Update Synthesis
  const synTitle = document.getElementById('diptych-synthesis-title');
  const synText = document.getElementById('diptych-synthesis-text');
  if (synTitle) synTitle.textContent = pairData.title;
  if (synText) synText.textContent = pairData.synthesis;

  // Clean old stages
  if (diptychLeftStage) diptychLeftStage.destroy();
  if (diptychRightStage) diptychRightStage.destroy();

  // Create new synchronized stages
  if (leftArt) {
    diptychLeftStage = new RelightingStage(leftMount, leftArt, {
      lightColor: '#f6eedf',
      intensity: 0.52,
      elevation: 0.95
    });
    await diptychLeftStage.init();
  }

  if (rightArt) {
    diptychRightStage = new RelightingStage(rightMount, rightArt, {
      lightColor: '#ff9e59',
      intensity: 0.54,
      elevation: 0.95
    });
    await diptychRightStage.init();
  }

  // Synchronized pointer tracking across both canvases
  if (stageContainer) {
    stageContainer.onpointermove = (e) => {
      const rect = stageContainer.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (diptychLeftStage) diptychLeftStage.setLightPosition(nx, ny);
      if (diptychRightStage) diptychRightStage.setLightPosition(nx, ny);
    };
  }
}

function setupDiptychButtons() {
  const presetButtons = document.querySelectorAll('.diptych-preset-btn');
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      presetButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeDiptychPair = btn.getAttribute('data-pair') || 'pair-1';
      await initDiptychStudio();
    });
  });
}

/* ==========================================================================
   10. BOOKING FORM SETUP (Xuất vé kỹ thuật số Digital Louvre Pass tức thì)
   ========================================================================== */
function setupBookingForm() {
  const form = document.getElementById('visit-booking-form');
  const ticketPass = document.getElementById('booking-ticket-pass');
  const btnReset = document.getElementById('btn-reset-booking');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('booking-name');
    const purposeSelect = document.getElementById('booking-purpose');
    const guestName = nameInput?.value.trim() || 'Khách Quý';
    const passType = purposeSelect?.options[purposeSelect.selectedIndex]?.text || 'Thương Mại & Triển Lãm';

    const guestEl = document.getElementById('ticket-guest-name');
    const typeEl = document.getElementById('ticket-pass-type');
    const serialEl = document.getElementById('ticket-serial');

    if (guestEl) guestEl.textContent = guestName;
    if (typeEl) typeEl.textContent = passType;
    if (serialEl) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      serialEl.textContent = `#ETH-2026-${randNum}`;
    }

    form.style.display = 'none';
    if (ticketPass) ticketPass.style.display = 'block';
  });

  btnReset?.addEventListener('click', () => {
    if (ticketPass) ticketPass.style.display = 'none';
    if (form) {
      form.reset();
      form.style.display = 'block';
    }
  });
}

/* ==========================================================================
   11. TORCH SPOTLIGHT POINTER TRACKING
   ========================================================================== */
function setupTorchSpotlight() {
  const torch = document.getElementById('torch-spotlight');
  if (!torch) return;

  window.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const renderTorch = () => {
    torchX += (mouseX - torchX) * 0.16;
    torchY += (mouseY - torchY) * 0.16;
    torch.style.left = `${torchX}px`;
    torch.style.top = `${torchY}px`;
    requestAnimationFrame(renderTorch);
  };
  requestAnimationFrame(renderTorch);
}

/* ==========================================================================
   12. SHADERS DRAWER SETUP
   ========================================================================== */
function setupShadersDrawer() {
  const btnHeader = document.getElementById('btn-open-shaders');
  const btnFooter = document.getElementById('btn-footer-shaders');
  const btnClose = document.getElementById('btn-close-shaders-drawer');
  const drawer = document.getElementById('shaders-drawer');
  const backdrop = document.getElementById('shaders-drawer-backdrop');

  const openDrawer = () => {
    drawer?.classList.add('is-open');
    backdrop?.classList.add('is-open');
  };

  const closeDrawer = () => {
    drawer?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
  };

  btnHeader?.addEventListener('click', openDrawer);
  btnFooter?.addEventListener('click', openDrawer);
  btnClose?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);

  const tabs = document.querySelectorAll('.code-tab-btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.getAttribute('data-tab');
      tabs.forEach((t) => t.classList.remove('active'));
      e.currentTarget.classList.add('active');

      document.querySelectorAll('.code-tab-content').forEach((c) => {
        c.style.display = 'none';
      });
      const activeContent = document.getElementById(`tab-${targetTab}`);
      if (activeContent) activeContent.style.display = 'block';
    });
  });
}

/* ==========================================================================
   11. HOME EXPERIENCES RENDERER (Plaster Wall, Alchemy Essays, Portals)
   ========================================================================== */
async function renderHomeExperiences() {
  const experiences = await getHomeExperiences();
  if (!experiences) return;

  const { plasterWall, materialAlchemy, wingPortals } = experiences;

  // 1. Plaster Relief Wall (Inspired by Half the Sky)
  if (plasterWall) {
    const chapterBadge = document.getElementById('plaster-chapter-badge');
    const title = document.getElementById('plaster-title');
    const subtitle = document.getElementById('plaster-subtitle');
    const grid = document.getElementById('plaster-panels-grid');

    if (chapterBadge && plasterWall.chapter) {
      chapterBadge.textContent = `${plasterWall.chapter} · ${plasterWall.badge || ''}`;
    }
    if (title && plasterWall.title) title.textContent = plasterWall.title;
    if (subtitle && plasterWall.subtitle) subtitle.textContent = plasterWall.subtitle;

    if (grid && plasterWall.panels) {
      grid.innerHTML = plasterWall.panels
        .map((p) => `
          <div class="plaster-panel-card" data-artwork-id="${p.artworkId}">
            <div>
              <div class="plaster-card-header">
                <span class="plaster-era-badge">${p.era}</span>
                <span class="plaster-light-badge">✦ ${p.lightAngle}</span>
              </div>
              <div class="plaster-media-wrap">
                <img src="${p.image}" alt="${p.title}" class="plaster-media-img" loading="lazy" />
                <div class="plaster-raking-overlay"></div>
              </div>
              <h3 class="plaster-card-title">${p.title}</h3>
              <div class="plaster-card-material">${p.material}</div>
              <div class="plaster-card-quote">${p.quote}</div>
              <p class="plaster-card-story">${p.story}</p>
            </div>
            <div>
              <div class="plaster-specs-row">
                <span class="plaster-specs-item">Độ sâu: <strong>${p.reliefDepth}</strong></span>
                <span class="plaster-specs-item">Góc chiếu: <strong>${p.lightAngle}</strong></span>
                <span class="plaster-specs-item">Niên đại: <strong>${p.age}</strong></span>
              </div>
              <button type="button" class="btn-plaster-inspect" data-target-art="${p.artworkId}">
                <span>✦</span> ${p.actionLabel || 'Soi Phù Điêu 3D'}
              </button>
            </div>
          </div>
        `)
        .join('');

      // Click events: Inspect in 3D
      grid.querySelectorAll('.btn-plaster-inspect').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const artId = btn.getAttribute('data-target-art');
          if (artId) openFocusArtwork(artId);
        });
      });

      grid.querySelectorAll('.plaster-panel-card').forEach((card) => {
        card.addEventListener('click', () => {
          const artId = card.getAttribute('data-artwork-id');
          if (artId) openFocusArtwork(artId);
        });
      });
    }

    // Interactive Grazing Light Presets (18°, 45°, 75°, 12°)
    const angleBtns = document.querySelectorAll('#plaster-angle-presets .angle-btn');
    angleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        angleBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const deg = btn.getAttribute('data-angle') || '18';
        const cards = document.querySelectorAll('.plaster-panel-card');
        cards.forEach((c) => {
          c.style.setProperty('--panel-light-deg', `${deg}deg`);
        });
      });
    });
  }

  // 2. Material Alchemy & Curatorial Manifesto (Inspired by AUGE Experience)
  if (materialAlchemy) {
    const chapterBadge = document.getElementById('alchemy-chapter-badge');
    const title = document.getElementById('alchemy-title');
    const subtitle = document.getElementById('alchemy-subtitle');
    const list = document.getElementById('alchemy-essays-list');

    if (chapterBadge && materialAlchemy.chapter) {
      chapterBadge.textContent = `${materialAlchemy.chapter} · ${materialAlchemy.badge || ''}`;
    }
    if (title && materialAlchemy.title) title.textContent = materialAlchemy.title;
    if (subtitle && materialAlchemy.subtitle) subtitle.textContent = materialAlchemy.subtitle;

    if (list && materialAlchemy.essays) {
      list.innerHTML = materialAlchemy.essays
        .map((essay) => `
          <article class="alchemy-essay-row" id="${essay.id}">
            <div class="alchemy-numeral-col">
              <span class="alchemy-huge-numeral">${essay.numeral}</span>
              <span class="alchemy-essay-category">${essay.category || 'GIÁM TUYỂN'}</span>
            </div>
            
            <div class="alchemy-content-col">
              <h3 class="alchemy-essay-title">${essay.title}</h3>
              <div class="alchemy-essay-subtitle">${essay.subtitle}</div>

              <div class="alchemy-secret-box">
                <span class="alchemy-box-label">✦ Bí Mật Bảo Tồn &amp; Khảo Cổ</span>
                <p class="alchemy-secret-text">${essay.historicalSecret}</p>
              </div>

              <div class="alchemy-peripheral-box">
                <span class="alchemy-box-label">✦ Ý Niệm Bên Lề &amp; Giải Phẫu Xúc Giác</span>
                <p class="alchemy-peripheral-text">${essay.peripheralIdea}</p>
              </div>
            </div>

            <div class="alchemy-specs-col">
              <div class="alchemy-metrics-card">
                <div class="alchemy-metrics-heading">Thông Số Quang Học &amp; Vật Liệu</div>
                ${(essay.metrics || [])
                  .map(
                    (m) => `
                  <div class="alchemy-metric-row">
                    <span class="alchemy-metric-label">${m.label}</span>
                    <span class="alchemy-metric-val">${m.value}</span>
                  </div>
                `
                  )
                  .join('')}
              </div>

              ${essay.quote ? `<div class="alchemy-quote-pendant">${essay.quote}</div>` : ''}
              <div style="margin-top: 18px;">
                <a href="#story/${essay.id}" class="btn-read-essay-arrow" style="font-size:0.82rem; color:var(--color-accent); font-weight:600; text-decoration:none;">
                  Đọc Toàn Văn Khảo Cứu &amp; Số Liệu →
                </a>
              </div>
            </div>
          </article>
        `)
        .join('');
    }
  }

  // 3. Chamber Portals (Lối dẫn vào 4 cánh triển lãm)
  if (wingPortals) {
    const chapterBadge = document.getElementById('portals-chapter-badge');
    const title = document.getElementById('portals-title');
    const subtitle = document.getElementById('portals-subtitle');
    const grid = document.getElementById('chamber-portals-grid');

    if (chapterBadge && wingPortals.chapter) {
      chapterBadge.textContent = `${wingPortals.chapter} · ${wingPortals.badge || ''}`;
    }
    if (title && wingPortals.title) title.textContent = wingPortals.title;
    if (subtitle && wingPortals.subtitle) subtitle.textContent = wingPortals.subtitle;

    if (grid && wingPortals.wings) {
      grid.innerHTML = wingPortals.wings
        .map((w) => `
          <div class="chamber-portal-card" data-room="${w.room}">
            <div>
              <div class="portal-card-top">
                <span class="portal-numeral">${w.numeral}</span>
                <span class="portal-counter-pill">${w.artworkCount}</span>
              </div>
              <div class="portal-img-wrap">
                <img src="${w.image}" alt="${w.name}" class="portal-thumb-img" loading="lazy" />
              </div>
              <h3 class="portal-title">${w.name}</h3>
              <div class="portal-era">${w.era}</div>
              <p class="portal-desc">${w.desc}</p>
            </div>

            <div class="portal-actions-row">
              <button type="button" class="btn-portal-enter btn-portal-3d" data-highlight-art="${w.highlightArtworkId}">
                <span>▶</span> Vào 3D
              </button>
              <button type="button" class="btn-portal-enter btn-portal-wing" data-filter-wing="${w.room}">
                <span>🏛</span> Xem Cánh
              </button>
            </div>
          </div>
        `)
        .join('');

      // Action: Enter 3D
      grid.querySelectorAll('.btn-portal-3d').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const artId = btn.getAttribute('data-highlight-art');
          if (artId) openFocusArtwork(artId);
        });
      });

      // Action: View Dedicated Room Hub
      grid.querySelectorAll('.btn-portal-wing').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const wingRoom = btn.getAttribute('data-filter-wing');
          navigateTo(`#room/${wingRoom}`);
        });
      });
    }
  }
}

/* ==========================================================================
   13. APP INITIALIZATION & EVENT BINDINGS
   ========================================================================== */
async function initApp() {
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloader-bar');
  const preloaderCount = document.getElementById('preloader-count');

  if (preloaderBar) preloaderBar.style.width = '30%';
  if (preloaderCount) preloaderCount.textContent = '30%';

  // Load configuration & theme engine
  await loadContent();
  await themeManager.init();
  i18n.init();
  allArtworksList = await getAllArtworks();
  window.openFocusArtwork = openFocusArtwork;
  window.exitFocusMode = exitFocusMode;
  window.navigateTo = navigateTo;
  window.switchView = navigateTo;
  window.initDiptychStudio = initDiptychStudio;

  // Initialize Lenis Smooth Scrolling Engine synchronized with GSAP ScrollTrigger
  initSmoothScrolling();

  // Cleanly revert SplitText before DOM text rewrite, then re-split translated text
  i18n.onBeforeLanguageChange(() => {
    revertSplitText();
  });
  i18n.onLanguageChange(() => {
    refreshSplitTextOnLanguageChange();
  });

  if (preloaderBar) preloaderBar.style.width = '60%';
  if (preloaderCount) preloaderCount.textContent = '60%';

  // Populate UI Sections & Routers
  setupNavigationRouting();
  setupZenDockCollapse();
  setupDossierDrawer();
  setupSearchModal();
  setupCollectionControls();
  await populateTimeline();
  await populateCuratorialSection();
  await renderHomeExperiences();
  setupBookingForm();
  setupShadersDrawer();
  setupTorchSpotlight();
  initAudioGuide();

  // Initialize Grand Continuous Ribbon Loom in Foyer (Strict Zero-Overlap Masterpiece Curation)
  // Chapter II (Plaster Wall) & Chapter IV (Chamber Portals) feature dedicated artworks;
  // Foyer Loom displays exclusively the remaining 9 CC0 masterpieces with zero duplication.
  const foyerLoomContainer = document.getElementById('foyer-carousel-stage');
  if (foyerLoomContainer && allArtworksList.length) {
    const chaptersReservedIds = new Set([
      'assyrian-winged-genie',
      'wheat-field-cypresses',
      'hokusai-great-wave',
      'unicorn-in-captivity',
      'roman-dancing-maenad',
      'rembrandt-aristotle',
      'hokusai-red-fuji',
      'unicorn-hunters'
    ]);
    const foyerArtworks = allArtworksList.filter((art) => !chaptersReservedIds.has(art.id));
    const currentTheme = await getThemeConfig(themeManager.currentMode);

    fullFoyerLoom = new UnwovenCarousel(
      foyerLoomContainer,
      foyerArtworks.length ? foyerArtworks : allArtworksList,
      currentTheme.unwovenFadeRgb,
      {
        onArtworkSelect: (art) => {
          openFocusArtwork(art);
        },
      }
    );
    fullFoyerLoom.init();
  }

  // Listen for custom artworkSelected event from Loom
  window.addEventListener('artworkSelected', (e) => {
    if (e.detail?.artwork) {
      openFocusArtwork(e.detail.artwork);
    }
  });

  // Zen Mode Controls (Exit & Next/Prev)
  document.getElementById('btn-exit-zen')?.addEventListener('click', exitFocusMode);
  document.getElementById('btn-prev-art')?.addEventListener('click', () => navigateArtworkStep(-1));
  document.getElementById('btn-next-art')?.addEventListener('click', () => navigateArtworkStep(1));

  // Circadian 24-Hour Solar Control & Diptych Studio Buttons
  setupCircadianControl();
  setupDiptychButtons();

  // Theme Toggle Button
  document.getElementById('theme-toggle-btn')?.addEventListener('click', async () => {
    await themeManager.toggle();
    applyRoomPalette(getCurrentActiveRoomId(), true);
  });

  // E2: Capture source thumbnail for Flip shared-element transitions
  document.addEventListener(
    'click',
    (e) => {
      const card = e.target.closest('.artwork-card, .room-art-card, .editorial-card, .story-art-card, .room-featured-card');
      if (card) {
        const img = card.querySelector('img');
        if (img) setPendingFlipSource(img);
      }
    },
    { capture: true }
  );

  // Keyboard Shortcuts
  window.addEventListener('keydown', async (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    if (e.key === 'Escape') {
      exitFocusMode();
      document.getElementById('artwork-dossier-drawer')?.classList.remove('is-open');
      document.getElementById('dossier-drawer-backdrop')?.classList.remove('is-open');
      document.getElementById('search-modal-backdrop')?.classList.remove('is-open');
      document.getElementById('shaders-drawer')?.classList.remove('is-open');
      document.getElementById('shaders-drawer-backdrop')?.classList.remove('is-open');
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      const exhibitionStage = document.getElementById('exhibition');
      if (exhibitionStage?.classList.contains('is-active')) {
        navigateArtworkStep(-1);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      const exhibitionStage = document.getElementById('exhibition');
      if (exhibitionStage?.classList.contains('is-active')) {
        navigateArtworkStep(1);
      }
    } else if (e.key === 't' || e.key === 'T') {
      await themeManager.toggle();
    } else if (e.key === '?' || e.key === '~') {
      const drawer = document.getElementById('shaders-drawer');
      const backdrop = document.getElementById('shaders-drawer-backdrop');
      drawer?.classList.toggle('is-open');
      backdrop?.classList.toggle('is-open');
    } else if (e.key === '1') {
      openFocusArtwork('assyrian-winged-genie');
    } else if (e.key === '2') {
      openFocusArtwork('wheat-field-cypresses');
    } else if (e.key === '3') {
      openFocusArtwork('hokusai-great-wave');
    } else if (e.key === '4') {
      openFocusArtwork('unicorn-in-captivity');
    }
  });

  if (preloaderBar) preloaderBar.style.width = '100%';
  if (preloaderCount) preloaderCount.textContent = '100%';

  // Dismiss preloader and launch cinematic opening sequence
  setTimeout(async () => {
    if (preloader) preloader.classList.add('is-hidden');

    // Launch Hero Opening Sequence, ScrollTriggers, Magnetic Hover & Museum Atmosphere
    await runHeroReveal();
    initScrollReveals();
    initMagneticAndHover();

    const foyerLoomContainer = document.getElementById('foyer-loom-wrap') || document.getElementById('foyer-carousel-stage');
    if (foyerLoomContainer) {
      initAmbientDustParticles(foyerLoomContainer);
    }
  }, 350);
}

// Start application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
