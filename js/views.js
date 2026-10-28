/**
 * VIEWS.JS — Modular View Renderers for ÉTHÉRÉ Atelier (Grand Edition)
 * Implements 3-tier museum taxonomy:
 *   Room (Hub)  →  Artwork (Detail Page)  →  Story (Curatorial Essay)
 * Plus the Stories Index page.
 */

import {
  getRooms,
  getRoom,
  getAllArtworks,
  getArtwork,
  getArtworksByRoom,
  getStories,
  getStory,
  getStoriesForArtwork,
  getStoriesForRoom,
  getRelatedArtworks,
  getRoomAdjacentArtworks,
} from './data.js';

/**
 * Escape HTML utility to prevent XSS in dynamic templates
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSpecValue(specs, labelKey) {
  if (!specs) return '';
  if (Array.isArray(specs)) {
    const item = specs.find((s) => s && s.label && s.label.toLowerCase().includes(labelKey.toLowerCase()));
    return item ? item.value : '';
  }
  if (typeof specs === 'object') {
    return specs[labelKey] || '';
  }
  return '';
}

/* ==========================================================================
   1. ROOM HUB VIEW RENDERER (#room/:id)
   ========================================================================== */
export async function renderRoomView(container, roomId) {
  const room = await getRoom(roomId);
  if (!room) {
    container.innerHTML = `
      <section class="view-not-found" style="padding: 120px 24px; text-align: center;">
        <h2 style="font-family: var(--font-serif); font-size: 2rem;">Không Tìm Thấy Cánh Triển Lãm</h2>
        <p style="color: var(--color-muted); margin: 16px 0 24px;">Cánh triển lãm "${escapeHtml(roomId)}" không tồn tại trong kho lưu trữ.</p>
        <a href="#collection" class="btn-room-cta">← Khám Phá Toàn Bộ Bộ Sưu Tập</a>
      </section>
    `;
    return;
  }

  const [allRooms, roomArtworks, relatedStories] = await Promise.all([
    getRooms(),
    getArtworksByRoom(room.id),
    getStoriesForRoom(room.id),
  ]);

  // Featured artwork of this room
  let featuredArt = roomArtworks.find((a) => a.id === room.artworkId) || roomArtworks[0] || null;

  // Next room calculation (cyclical)
  const currentIdx = allRooms.findIndex((r) => r.id === room.id);
  const nextIdx = (currentIdx + 1) % allRooms.length;
  const nextRoom = allRooms[nextIdx];

  container.innerHTML = `
    <div class="room-view-wrapper">
      <!-- Wing Header Hero -->
      <header class="room-view-header">
        <div class="room-header-inner">
          <div class="room-badge-row">
            <span class="room-numeral-pill">CÁNH ${escapeHtml(room.numeral)}</span>
            <span class="room-period-badge">${escapeHtml(room.period)}</span>
            ${room.lightHint ? `<span class="room-lighthint-badge"><span class="lighthint-icon">✦</span> ${escapeHtml(room.lightHint)}</span>` : ''}
          </div>
          <h1 class="room-title">${escapeHtml(room.name)}</h1>
          <p class="room-tagline">${escapeHtml(room.tagline)}</p>
        </div>
      </header>

      <!-- Featured Artwork Hero Showcase -->
      ${
        featuredArt
          ? `
        <section class="room-featured-section" aria-label="Kiệt tác tiêu biểu của cánh">
          <div class="room-featured-card">
            <div class="room-featured-visual">
              <img 
                src="${escapeHtml(featuredArt.image)}" 
                alt="${escapeHtml(featuredArt.alt || featuredArt.title)}" 
                class="room-featured-img" 
                loading="eager" />
              <div class="room-featured-overlay-actions">
                <button 
                  type="button" 
                  class="btn-featured-3d btn-launch-3d-relighting" 
                  data-artwork-id="${escapeHtml(featuredArt.id)}"
                  title="Thưởng lãm kiệt tác này trong không gian 3D tương tác">
                  <span class="sparkle-icon">✦</span> Thưởng Lãm 3D Chiếu Sáng
                </button>
              </div>
            </div>
            <div class="room-featured-content">
              <span class="room-section-label">✦ KIỆT TÁC TIÊU BIỂU</span>
              <h2 class="featured-art-title">${escapeHtml(featuredArt.title)}</h2>
              <div class="featured-art-meta">
                <span class="featured-artist">${escapeHtml(featuredArt.artist)}</span>
                <span class="meta-sep">·</span>
                <span class="featured-century">${escapeHtml(featuredArt.century)} (${escapeHtml(featuredArt.year)})</span>
              </div>
              <p class="featured-art-narrative">${escapeHtml(featuredArt.narrative)}</p>
              <div class="featured-actions-row">
                <a href="#artwork/${escapeHtml(featuredArt.id)}" class="btn-dossier-link">
                  Hồ Sơ Toàn Phần &amp; Giám Tuyển →
                </a>
                <button 
                  type="button" 
                  class="btn-room-secondary btn-launch-3d-relighting"
                  data-artwork-id="${escapeHtml(featuredArt.id)}">
                  ✦ Xem 3D
                </button>
              </div>
            </div>
          </div>
        </section>
      `
          : ''
      }

      <!-- Artworks Grid in this Room -->
      <section class="room-artworks-section" aria-label="Tất cả hiện vật trong cánh ${escapeHtml(room.numeral)}">
        <div class="room-section-header">
          <div>
            <span class="room-section-label">DANH MỤC HIỆN VẬT</span>
            <h2 class="room-grid-heading">Không Gian Trưng Bày (${roomArtworks.length} Kiệt Tác)</h2>
          </div>
          <a href="#collection" class="room-view-all-link">Xem trong kho lưu trữ chung →</a>
        </div>

        <div class="room-artworks-grid">
          ${roomArtworks
            .map(
              (art) => `
            <article class="room-art-card">
              <div class="room-art-thumb-wrap">
                <img 
                  src="${escapeHtml(art.image)}" 
                  alt="${escapeHtml(art.alt || art.title)}" 
                  class="room-art-thumb" 
                  loading="lazy" />
                <div class="room-card-hover-actions">
                  <a href="#artwork/${escapeHtml(art.id)}" class="btn-card-inspect">Chi Tiết</a>
                  <button type="button" class="btn-card-3d btn-launch-3d-relighting" data-artwork-id="${escapeHtml(art.id)}" title="Mở 3D">✦ 3D</button>
                </div>
              </div>
              <div class="room-art-info">
                <div class="room-art-category-pill">${escapeHtml(art.category)}</div>
                <h3 class="room-art-title">
                  <a href="#artwork/${escapeHtml(art.id)}" class="room-art-title-link">${escapeHtml(art.title)}</a>
                </h3>
                <p class="room-art-artist">${escapeHtml(art.artist)}</p>
                <div class="room-art-footer">
                  <span class="room-art-year">${escapeHtml(art.year)}</span>
                  <a href="#artwork/${escapeHtml(art.id)}" class="room-card-arrow" aria-label="Xem ${escapeHtml(art.title)}">→</a>
                </div>
              </div>
            </article>
          `
            )
            .join('')}
        </div>
      </section>

      <!-- Related Curatorial Stories for this Room -->
      ${
        relatedStories.length > 0
          ? `
        <section class="room-stories-section" aria-label="Bài luận giám tuyển liên quan">
          <div class="room-section-header">
            <div>
              <span class="room-section-label">GÓC NHÌN GIÁM TUYỂN</span>
              <h2 class="room-grid-heading">Bài Luận Chuyên Đề Về Cánh ${escapeHtml(room.numeral)}</h2>
            </div>
            <a href="#stories" class="room-view-all-link">Tất cả bài luận →</a>
          </div>

          <div class="room-stories-grid">
            ${relatedStories
              .map(
                (story) => `
              <article class="room-story-card">
                <span class="story-category-tag">${escapeHtml(story.category)}</span>
                <h3 class="story-card-title">
                  <a href="#story/${escapeHtml(story.id)}" class="story-title-link">${escapeHtml(story.title)}</a>
                </h3>
                <p class="story-card-subtitle">${escapeHtml(story.subtitle)}</p>
                ${story.quote ? `<blockquote class="story-card-quote">${escapeHtml(story.quote)}</blockquote>` : ''}
                <div class="story-card-footer">
                  <a href="#story/${escapeHtml(story.id)}" class="btn-read-story">Đọc Bài Luận Chuyên Sâu →</a>
                </div>
              </article>
            `
              )
              .join('')}
          </div>
        </section>
      `
          : ''
      }

      <!-- Next Wing Cyclical Navigation Bar -->
      <nav class="room-cyclical-nav" aria-label="Điều hướng sang cánh kế tiếp">
        <div class="cyclical-nav-lead">Tiếp tục hành trình thưởng lãm:</div>
        <a href="#room/${escapeHtml(nextRoom.numeral)}" class="btn-next-room-link">
          <div class="next-room-meta">
            <span class="next-label">CÁNH TIẾP THEO</span>
            <span class="next-title">Cánh ${escapeHtml(nextRoom.numeral)}: ${escapeHtml(nextRoom.name)}</span>
            <span class="next-period">${escapeHtml(nextRoom.period)}</span>
          </div>
          <span class="next-arrow-circle" aria-hidden="true">→</span>
        </a>
      </nav>
    </div>
  `;
}

/* ==========================================================================
   2. ARTWORK DETAIL PAGE RENDERER (#artwork/:id)
   ========================================================================== */
export async function renderArtworkView(container, artworkId) {
  const art = await getArtwork(artworkId);
  if (!art) {
    container.innerHTML = `
      <section class="view-not-found" style="padding: 120px 24px; text-align: center;">
        <h2 style="font-family: var(--font-serif); font-size: 2rem;">Không Tìm Thấy Tác Phẩm</h2>
        <p style="color: var(--color-muted); margin: 16px 0 24px;">Mã định danh "${escapeHtml(artworkId)}" không tồn tại trong kho tàng dữ liệu.</p>
        <a href="#collection" class="btn-room-cta">← Quay Lại Kho Lưu Trữ</a>
      </section>
    `;
    return;
  }

  const [adjacent, relatedArtworks, relatedStories] = await Promise.all([
    getRoomAdjacentArtworks(art.id),
    getRelatedArtworks(art.id),
    getStoriesForArtwork(art.id),
  ]);

  container.innerHTML = `
    <article class="artwork-view-wrapper" itemscope itemtype="https://schema.org/VisualArtwork">
      <!-- Top Navigation & Back Link -->
      <nav class="artwork-top-nav" aria-label="Điều hướng quay lại">
        <a href="#room/${escapeHtml(art.room)}" class="btn-back-to-room">
          <span aria-hidden="true">←</span> Quay lại Cánh ${escapeHtml(art.room)}: ${escapeHtml(art.roomName)}
        </a>
        <div class="artwork-room-badge">
          Cánh ${escapeHtml(art.room)} · ${escapeHtml(art.century)}
        </div>
      </nav>

      <!-- Main Showcase Grid: Left Large Visual, Right Specs & Narrative -->
      <div class="artwork-main-showcase">
        <!-- Left: Image Showcase with Relighting Trigger -->
        <div class="artwork-visual-column">
          <div class="artwork-image-stage">
            <img 
              src="${escapeHtml(art.image)}" 
              alt="${escapeHtml(art.alt || art.title)}" 
              class="artwork-master-image" 
              itemprop="image" 
              loading="eager" />
            <div class="artwork-image-watermark">ÉTHÉRÉ ATELIER · 3D RELIGHTING ENGINE</div>
          </div>

          <!-- Relighting Call-to-Action Card -->
          <div class="artwork-3d-cta-banner">
            <div class="cta-banner-text">
              <div class="cta-badge">✦ KHÔNG GIAN TƯƠNG TÁC 3D</div>
              <h3 class="cta-title">Chiếu Sáng Bề Mặt Đa Hướng (Relighting)</h3>
              <p class="cta-desc">Mô phỏng nguồn sáng ảo quét qua gờ sơn, rãnh đục và thớ sợi bằng bản đồ độ sâu quang học.</p>
            </div>
            <button 
              type="button" 
              class="btn-launch-relighting-master btn-launch-3d-relighting" 
              data-artwork-id="${escapeHtml(art.id)}"
              title="Kích hoạt chế độ chiếu sáng 3D cho kiệt tác này">
              <span class="sparkle-icon">✦</span> Kích Hoạt 3D Relighting
            </button>
          </div>
        </div>

        <!-- Right: Dossier, Curatorial Essay, Technical Specifications -->
        <div class="artwork-dossier-column">
          <div class="artwork-header-block">
            <span class="artwork-category-badge" itemprop="artform">${escapeHtml(art.category)}</span>
            <h1 class="artwork-page-title" itemprop="name">${escapeHtml(art.title)}</h1>
            <div class="artwork-artist-line">
              <span class="artist-name" itemprop="creator">${escapeHtml(art.artist)}</span>
              <span class="meta-dot">·</span>
              <span class="artwork-year">${escapeHtml(art.year)}</span>
            </div>
            <div class="artwork-origin-line">
              <span class="origin-label">Xuất xứ:</span>
              <span class="origin-val">${escapeHtml(art.origin)} (${escapeHtml(art.source || 'The Met Collection')})</span>
            </div>
          </div>

          <!-- Technical Specs Definition List -->
          <div class="artwork-specs-card">
            <h2 class="specs-heading">Hồ Sơ Kỹ Thuật &amp; Giám Định</h2>
            <dl class="specs-definition-list">
              <div class="spec-row">
                <dt>Kích thước</dt>
                <dd>${escapeHtml(getSpecValue(art.specs, 'kích thước') || art.specs?.dimensions || 'Chưa công bố')}</dd>
              </div>
              <div class="spec-row">
                <dt>Chất liệu</dt>
                <dd>${escapeHtml(getSpecValue(art.specs, 'chất liệu') || art.specs?.medium || 'Chưa phân tích')}</dd>
              </div>
              <div class="spec-row">
                <dt>Kỹ thuật tạo tác</dt>
                <dd>${escapeHtml(art.technique || 'Kỹ thuật cổ truyền')}</dd>
              </div>
              <div class="spec-row">
                <dt>Niên đại</dt>
                <dd>${escapeHtml(art.year)} (${escapeHtml(art.century)})</dd>
              </div>
              <div class="spec-row">
                <dt>Vị trí trưng bày</dt>
                <dd>Cánh ${escapeHtml(art.room)} — ${escapeHtml(art.roomName)}</dd>
              </div>
              <div class="spec-row">
                <dt>Quyền truy cập</dt>
                <dd>CC0 Open Access / Phạm vi công cộng</dd>
              </div>
            </dl>
          </div>

          <!-- Curatorial Narrative & Interpretation -->
          <div class="artwork-narrative-section">
            <h2 class="narrative-heading">Khảo Cứu &amp; Lời Tựa Giám Tuyển</h2>
            <p class="artwork-narrative-p">${escapeHtml(art.narrative)}</p>
            ${
              art.curatorial
                ? `
              <div class="artwork-curatorial-callout">
                <span class="callout-label">✦ Ghi Chú Phân Tích Xúc Giác</span>
                <p class="curatorial-text">${escapeHtml(art.curatorial)}</p>
              </div>
            `
                : ''
            }
          </div>
        </div>
      </div>

      <!-- Room Cyclical Artwork Cycler (Prev / Next inside same room) -->
      ${
        adjacent.prev && adjacent.next
          ? `
        <nav class="artwork-adjacent-nav" aria-label="Chuyển tác phẩm cùng cánh">
          <a href="#artwork/${escapeHtml(adjacent.prev.id)}" class="adjacent-link prev-link">
            <span class="nav-direction">← TÁC PHẨM TRƯỚC (CÁNH ${escapeHtml(art.room)})</span>
            <span class="nav-art-title">${escapeHtml(adjacent.prev.title)}</span>
          </a>
          <a href="#artwork/${escapeHtml(adjacent.next.id)}" class="adjacent-link next-link">
            <span class="nav-direction">TÁC PHẨM TIẾP THEO (CÁNH ${escapeHtml(art.room)}) →</span>
            <span class="nav-art-title">${escapeHtml(adjacent.next.title)}</span>
          </a>
        </nav>
      `
          : ''
      }

      <!-- Related Stories Section -->
      ${
        relatedStories.length > 0
          ? `
        <section class="artwork-related-stories" aria-label="Bài luận liên quan">
          <div class="related-section-header">
            <span class="section-kicker">LIÊN HỆ HỌC THUẬT</span>
            <h2 class="related-heading">Bài Luận Đề Cập Đến Hiện Vật Này</h2>
          </div>
          <div class="related-stories-grid">
            ${relatedStories
              .map(
                (story) => `
              <article class="related-story-card">
                <span class="story-category-tag">${escapeHtml(story.category)}</span>
                <h3 class="related-story-title">
                  <a href="#story/${escapeHtml(story.id)}">${escapeHtml(story.title)}</a>
                </h3>
                <p class="related-story-sub">${escapeHtml(story.subtitle)}</p>
                <a href="#story/${escapeHtml(story.id)}" class="btn-read-essay-arrow">Đọc bài luận chuyên đề →</a>
              </article>
            `
              )
              .join('')}
          </div>
        </section>
      `
          : ''
      }

      <!-- Related Artworks Section -->
      ${
        relatedArtworks.length > 0
          ? `
        <section class="artwork-related-artworks" aria-label="Tác phẩm liên quan">
          <div class="related-section-header">
            <span class="section-kicker">ĐỐI SÁNH NGHỆ THUẬT</span>
            <h2 class="related-heading">Kiệt Tác Cùng Niên Đại &amp; Kỹ Thuật</h2>
          </div>
          <div class="related-artworks-grid">
            ${relatedArtworks
              .map(
                (rel) => `
              <article class="rel-art-card">
                <div class="rel-thumb-wrap">
                  <img src="${escapeHtml(rel.image)}" alt="${escapeHtml(rel.alt || rel.title)}" class="rel-thumb" loading="lazy" />
                  <a href="#artwork/${escapeHtml(rel.id)}" class="rel-overlay-link" aria-label="Xem ${escapeHtml(rel.title)}"></a>
                </div>
                <div class="rel-info">
                  <div class="rel-category">${escapeHtml(rel.category)}</div>
                  <h3 class="rel-title"><a href="#artwork/${escapeHtml(rel.id)}">${escapeHtml(rel.title)}</a></h3>
                  <div class="rel-artist">${escapeHtml(rel.artist)} (${escapeHtml(rel.year)})</div>
                </div>
              </article>
            `
              )
              .join('')}
          </div>
        </section>
      `
          : ''
      }
    </article>
  `;
}

/* ==========================================================================
   3. STORIES INDEX VIEW RENDERER (#stories)
   ========================================================================== */
export async function renderStoriesIndexView(container) {
  const stories = await getStories();

  container.innerHTML = `
    <div class="stories-index-wrapper">
      <header class="stories-index-header">
        <span class="stories-kicker">CHỈ MỤC BÀI LUẬN GIÁM TUYỂN (ESSAIS CURATORIAUX)</span>
        <h1 class="stories-title">Bản Tuyên Ngôn Vật Liệu &amp; Ý Niệm Bên Lề</h1>
        <p class="stories-lead">
          Khảo cứu vi mô về cấu trúc bề mặt, hoá học sắc tố và bản chất nhị phân của các loại chất liệu nghệ thuật cổ truyền.
          Được biên soạn bởi Hội đồng Giám tuyển ÉTHÉRÉ Atelier.
        </p>
      </header>

      <div class="stories-grid-container">
        ${stories
          .map(
            (story, index) => `
          <article class="story-index-card">
            <div class="story-index-header">
              <div class="story-badge-row">
                <span class="story-numeral-pill">BÀI LUẬN ${escapeHtml(story.numeral)}</span>
                <span class="story-category-tag">${escapeHtml(story.category)}</span>
              </div>
              <h2 class="story-index-title">
                <a href="#story/${escapeHtml(story.id)}" class="story-index-title-link">${escapeHtml(story.title)}</a>
              </h2>
              <div class="story-index-sub">${escapeHtml(story.subtitle)}</div>
            </div>

            <div class="story-index-body">
              <div class="story-secret-snippet">
                <span class="snippet-label">✦ Bí Mật Khảo Cổ:</span>
                <p class="snippet-text">${escapeHtml(story.historicalSecret)}</p>
              </div>

              ${story.quote ? `<blockquote class="story-index-quote">${escapeHtml(story.quote)}</blockquote>` : ''}

              <div class="story-covered-wings">
                <span class="covered-label">Cánh liên quan:</span>
                ${(story.rooms || [])
                  .map(
                    (r) => `
                  <a href="#room/${escapeHtml(r)}" class="wing-tag">Cánh ${escapeHtml(r)}</a>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="story-index-footer">
              <a href="#story/${escapeHtml(story.id)}" class="btn-read-story-index">
                Đọc Toàn Văn Khảo Cứu &amp; Số Liệu →
              </a>
            </div>
          </article>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}

/* ==========================================================================
   4. SINGLE STORY VIEW RENDERER (#story/:id)
   ========================================================================== */
export async function renderStoryView(container, storyId) {
  const story = await getStory(storyId);
  if (!story) {
    container.innerHTML = `
      <section class="view-not-found" style="padding: 120px 24px; text-align: center;">
        <h2 style="font-family: var(--font-serif); font-size: 2rem;">Không Tìm Thấy Bài Luận</h2>
        <p style="color: var(--color-muted); margin: 16px 0 24px;">Bài luận "${escapeHtml(storyId)}" không có trong danh mục.</p>
        <a href="#stories" class="btn-room-cta">← Trở Về Chỉ Mục Bài Luận</a>
      </section>
    `;
    return;
  }

  // Get artworks referenced in this story
  const allArtworks = await getAllArtworks();
  const referencedArtworks = (story.relatedArtworkIds || [])
    .map((id) => allArtworks.find((a) => a.id === id))
    .filter(Boolean);

  container.innerHTML = `
    <article class="story-view-wrapper">
      <!-- Back Navigation -->
      <nav class="story-top-nav" aria-label="Điều hướng bài luận">
        <a href="#stories" class="btn-back-to-stories">
          <span aria-hidden="true">←</span> Quay lại Chỉ Mục Bài Luận
        </a>
        <div class="story-top-category">
          ${escapeHtml(story.category)} · Bài Luận ${escapeHtml(story.numeral)}
        </div>
      </nav>

      <!-- Editorial Header -->
      <header class="single-story-header">
        <div class="story-numeral-kicker">CHƯƠNG GIÁM TUYỂN ${escapeHtml(story.numeral)}</div>
        <h1 class="single-story-title">${escapeHtml(story.title)}</h1>
        <p class="single-story-subtitle">${escapeHtml(story.subtitle)}</p>
        
        <div class="story-wings-bar">
          <span class="wings-bar-label">Phạm vi khảo cứu trong bảo tàng:</span>
          ${(story.rooms || [])
            .map(
              (r) => `
            <a href="#room/${escapeHtml(r)}" class="story-wing-pill">Cánh ${escapeHtml(r)}</a>
          `
            )
            .join('')}
        </div>
      </header>

      <!-- Pull Quote -->
      ${
        story.quote
          ? `
        <figure class="story-pull-quote-wrapper">
          <blockquote class="story-pull-quote">${escapeHtml(story.quote)}</blockquote>
          <figcaption class="story-quote-caption">Trích yếu luận cương giám tuyển ÉTHÉRÉ</figcaption>
        </figure>
      `
          : ''
      }

      <!-- Main Editorial Body (Two-Column Layout) -->
      <div class="story-content-layout">
        <div class="story-narrative-column">
          <!-- Section 1: Historical Secret -->
          <section class="story-essay-section">
            <h2 class="section-title">✦ Bí Mật Bảo Tồn &amp; Khảo Cổ</h2>
            <div class="section-prose">
              <p>${escapeHtml(story.historicalSecret)}</p>
            </div>
          </section>

          <!-- Section 2: Peripheral Idea -->
          <section class="story-essay-section">
            <h2 class="section-title">✦ Ý Niệm Bên Lề &amp; Giải Phẫu Xúc Giác</h2>
            <div class="section-prose">
              <p>${escapeHtml(story.peripheralIdea)}</p>
            </div>
          </section>
        </div>

        <!-- Right: Metrics & Material Specifications Column -->
        <aside class="story-specs-column">
          <div class="story-metrics-card">
            <h3 class="metrics-card-heading">Thông Số Quang Học &amp; Vật Liệu</h3>
            <div class="metrics-grid">
              ${(story.metrics || [])
                .map(
                  (m) => `
                <div class="metric-item">
                  <span class="metric-label">${escapeHtml(m.label)}</span>
                  <span class="metric-value">${escapeHtml(m.value)}</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </aside>
      </div>

      <!-- Artworks referenced in this story -->
      ${
        referencedArtworks.length > 0
          ? `
        <section class="story-referenced-artworks" aria-label="Các kiệt tác xuất hiện trong bài luận">
          <div class="story-artworks-header">
            <span class="artworks-kicker">HIỆN VẬT MINH HOẠ</span>
            <h2 class="artworks-heading">Kiệt Tác Minh Chứng Trong Bài Luận</h2>
          </div>

          <div class="story-artworks-grid">
            ${referencedArtworks
              .map(
                (art) => `
              <article class="story-art-card">
                <div class="story-art-visual">
                  <img src="${escapeHtml(art.image)}" alt="${escapeHtml(art.alt || art.title)}" class="story-art-img" loading="lazy" />
                  <div class="story-art-actions">
                    <a href="#artwork/${escapeHtml(art.id)}" class="btn-inspect-art">Hồ Sơ</a>
                    <button type="button" class="btn-art-3d btn-launch-3d-relighting" data-artwork-id="${escapeHtml(art.id)}">✦ 3D</button>
                  </div>
                </div>
                <div class="story-art-details">
                  <div class="story-art-room">Cánh ${escapeHtml(art.room)} · ${escapeHtml(art.category)}</div>
                  <h3 class="story-art-title"><a href="#artwork/${escapeHtml(art.id)}">${escapeHtml(art.title)}</a></h3>
                  <div class="story-art-artist">${escapeHtml(art.artist)} (${escapeHtml(art.year)})</div>
                </div>
              </article>
            `
              )
              .join('')}
          </div>
        </section>
      `
          : ''
      }
    </article>
  `;
}
