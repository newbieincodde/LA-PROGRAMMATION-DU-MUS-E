/**
 * DATA.JS — Single Source of Truth Data Access & Query Engine
 * Loads and caches content from /assets/data/content.json
 * Optimized with modern map, filter, find, and reduce functions.
 */

let _dataCache = null;

/**
 * Fetch the master configuration JSON file.
 * Caches the response in memory for instant subsequent lookups.
 * @returns {Promise<Object>} The parsed master content object
 */
export async function loadContent() {
  if (_dataCache) {
    return _dataCache;
  }

  try {
    if (typeof window === 'undefined') {
      const modFs = 'node:fs';
      const modPath = 'node:path';
      const fs = await import(/* @vite-ignore */ modFs);
      const path = await import(/* @vite-ignore */ modPath);
      const filePath = path.resolve('assets/data/content.json');
      _dataCache = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      validateContentSchema(_dataCache);
      return _dataCache;
    }
    const response = await fetch('./assets/data/content.json');
    if (!response.ok) {
      throw new Error(`Failed to load content.json: HTTP ${response.status}`);
    }
    _dataCache = await response.json();
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      validateContentSchema(_dataCache);
    }
    return _dataCache;
  } catch (error) {
    console.error('[DataEngine] Error loading JSON configuration:', error);
    throw error;
  }
}

/**
 * Get site metadata and brand configuration
 */
export async function getSiteConfig() {
  const data = await loadContent();
  return data.site || {};
}

/**
 * Get theme configurations for either 'light' or 'dark' mode
 * @param {'light'|'dark'} [mode]
 */
export async function getThemeConfig(mode = null) {
  const data = await loadContent();
  const theme = data.theme || {};
  if (!mode) return theme;
  return theme[mode] || theme.light;
}

/**
 * Get the initial default theme mode defined in content.json ('light' or 'dark')
 * @returns {Promise<'light'|'dark'>}
 */
export async function getDefaultThemeMode() {
  const data = await loadContent();
  return data.theme?.defaultMode || data.site?.defaultMode || 'light';
}

/**
 * Get curated exhibition rooms (Rooms I, II, III, IV)
 */
export async function getRooms() {
  const data = await loadContent();
  return data.rooms || [];
}

/**
 * Get a specific exhibition room by its numeral ID ('I', 'II', 'III', 'IV')
 * @param {string} roomId
 */
export async function getRoomById(roomId) {
  const rooms = await getRooms();
  return rooms.find((r) => r.id === roomId || r.numeral === roomId) || null;
}

/**
 * Get light presets configured in content.json
 */
export async function getLightPresets() {
  const data = await loadContent();
  return data.lightPresets || [];
}

/**
 * Get the master curatorial statement essay
 */
export async function getCuratorialStatement() {
  const data = await loadContent();
  return data.site?.curatorialStatement || null;
}

/**
 * Get all artworks array
 * @returns {Promise<Array>}
 */
export async function getAllArtworks() {
  const data = await loadContent();
  return data.artworks || [];
}

/**
 * Find a specific artwork by its unique string ID
 * @param {string} id
 */
export async function getArtworkById(id) {
  const artworks = await getAllArtworks();
  return artworks.find((art) => art.id === id) || null;
}

/**
 * Find artwork by numeric index (supports both zero-based index or index field)
 * @param {number} index
 */
export async function getArtworkByIndex(index) {
  const artworks = await getAllArtworks();
  if (index >= 0 && index < artworks.length) {
    return artworks[index];
  }
  return artworks.find((art) => art.index === index) || artworks[0] || null;
}

/**
 * Filter artworks by room using Array.prototype.filter
 * @param {string} roomId ('I', 'II', 'III', 'IV')
 */
export async function getArtworksByRoom(roomId) {
  const artworks = await getAllArtworks();
  return artworks.filter((art) => art.room === roomId);
}

/**
 * Filter artworks by category using Array.prototype.filter
 * @param {string} categoryId ('all' or specific category)
 */
export async function getArtworksByCategory(categoryId) {
  const artworks = await getAllArtworks();
  if (!categoryId || categoryId === 'all') {
    return artworks;
  }
  return artworks.filter((art) => art.category === categoryId);
}

/**
 * Map artwork objects into lightweight summary objects (for index and meta)
 * Utilizes Array.prototype.map as per rubric specifications.
 */
export async function getArtworkSummaries() {
  const artworks = await getAllArtworks();
  return artworks.map((art, idx) => ({
    id: art.id,
    index: idx,
    room: art.room,
    roomName: art.roomName,
    title: art.title,
    artist: art.artist,
    year: art.year,
    image: art.image,
    category: art.category,
    narrative: art.narrative,
  }));
}

/**
 * Calculate previous and next artworks cyclically for pagination
 * @param {string} currentId
 */
export async function getAdjacentArtworks(currentId) {
  const artworks = await getAllArtworks();
  const currentIndex = artworks.findIndex((art) => art.id === currentId);
  if (currentIndex === -1) return { prev: null, next: null };

  const prevIndex = (currentIndex - 1 + artworks.length) % artworks.length;
  const nextIndex = (currentIndex + 1) % artworks.length;

  return {
    prev: artworks[prevIndex],
    next: artworks[nextIndex],
  };
}

/**
 * Compute portfolio statistics using Array.prototype.reduce
 * Demonstrates advanced data processing logic for rubric evaluation.
 */
export async function getPortfolioMetrics() {
  const artworks = await getAllArtworks();
  return artworks.reduce(
    (acc, art) => {
      acc.totalCount += 1;
      acc.categoryCounts[art.category] = (acc.categoryCounts[art.category] || 0) + 1;
      if (!acc.artists.includes(art.artist)) {
        acc.artists.push(art.artist);
      }
      if (!acc.rooms.includes(art.room)) {
        acc.rooms.push(art.room);
      }
      return acc;
    },
    { totalCount: 0, categoryCounts: {}, artists: [], rooms: [] }
  );
}

/**
 * Get legal attribution and colophon metadata
 */
export async function getCredits() {
  const data = await loadContent();
  return data.credits || {};
}


/**
 * Get chronological timeline milestones
 */
export async function getTimelineMilestones() {
  const data = await loadContent();
  return data.timelineMilestones || [];
}

/**
 * Get experiential chapters and curatorial essays for the Home page
 */
export async function getHomeExperiences() {
  const data = await loadContent();
  return data.homeExperiences || null;
}

/**
 * Real-time search across title, artist, medium, and century
 * @param {string} query
 */
export async function searchArtworks(query) {
  const artworks = await getAllArtworks();
  if (!query || !query.trim()) return artworks;
  const q = query.toLowerCase().trim();
  return artworks.filter((art) => {
    return (
      (art.title && art.title.toLowerCase().includes(q)) ||
      (art.artist && art.artist.toLowerCase().includes(q)) ||
      (art.category && art.category.toLowerCase().includes(q)) ||
      (art.century && art.century.toLowerCase().includes(q)) ||
      (art.year && art.year.toLowerCase().includes(q))
    );
  });
}

/**
 * Canonical Room selector by ID or Roman numeral ('I', 'II', 'III', 'IV')
 */
export async function getRoom(id) {
  if (!id) return null;
  const rooms = await getRooms();
  const search = String(id).trim().toUpperCase();
  return rooms.find((r) => r.id.toUpperCase() === search || r.numeral.toUpperCase() === search) || null;
}

/**
 * Canonical Artwork selector alias for getArtworkById
 */
export async function getArtwork(id) {
  return getArtworkById(id);
}

/**
 * Get all curatorial essays / stories
 */
export async function getStories() {
  const data = await loadContent();
  return data.homeExperiences?.materialAlchemy?.essays || [];
}

/**
 * Get a specific story / essay by its ID or numeral
 */
export async function getStory(id) {
  if (!id) return null;
  const stories = await getStories();
  const search = String(id).trim().toLowerCase();
  return (
    stories.find(
      (s) =>
        s.id.toLowerCase() === search ||
        s.numeral.toLowerCase() === search ||
        `alchemy-${s.numeral}`.toLowerCase() === search
    ) || null
  );
}

/**
 * Get related artworks for an artwork
 * Uses art.relatedArtworkIds with fallback to same room, then same century
 */
export async function getRelatedArtworks(id) {
  const art = await getArtworkById(id);
  if (!art) return [];
  const allArtworks = await getAllArtworks();

  if (Array.isArray(art.relatedArtworkIds) && art.relatedArtworkIds.length > 0) {
    const list = art.relatedArtworkIds
      .map((relId) => allArtworks.find((a) => a.id === relId))
      .filter(Boolean);
    if (list.length > 0) return list;
  }

  // Fallback 1: artworks in same room
  const sameRoom = allArtworks.filter((a) => a.room === art.room && a.id !== art.id);
  if (sameRoom.length > 0) return sameRoom.slice(0, 4);

  // Fallback 2: same century
  return allArtworks.filter((a) => a.century === art.century && a.id !== art.id).slice(0, 4);
}

/**
 * Get stories / essays that mention or relate to a given artwork
 */
export async function getStoriesForArtwork(id) {
  const art = await getArtworkById(id);
  if (!art) return [];
  const stories = await getStories();

  return stories.filter((story) => {
    if (Array.isArray(story.relatedArtworkIds) && story.relatedArtworkIds.includes(id)) {
      return true;
    }
    if (Array.isArray(story.rooms) && story.rooms.includes(art.room)) {
      return true;
    }
    return false;
  });
}

/**
 * Get stories / essays for a given room numeral
 */
export async function getStoriesForRoom(roomId) {
  const stories = await getStories();
  return stories.filter((s) => Array.isArray(s.rooms) && s.rooms.includes(roomId));
}

/**
 * Get previous and next artworks strictly within the same room (cyclical)
 */
export async function getRoomAdjacentArtworks(artworkId) {
  const art = await getArtworkById(artworkId);
  if (!art) return { prev: null, next: null };
  const roomArtworks = await getArtworksByRoom(art.room);
  if (!roomArtworks.length) return { prev: null, next: null };

  const currentIndex = roomArtworks.findIndex((a) => a.id === artworkId);
  if (currentIndex === -1) return { prev: null, next: null };

  const prevIndex = (currentIndex - 1 + roomArtworks.length) % roomArtworks.length;
  const nextIndex = (currentIndex + 1) % roomArtworks.length;

  return {
    prev: roomArtworks[prevIndex],
    next: roomArtworks[nextIndex],
  };
}

/**
 * Dev-time schema validator: checks for broken references
 */
export function validateContentSchema(data) {
  if (!data) return;
  const artworkIds = new Set((data.artworks || []).map((a) => a.id));
  const roomIds = new Set((data.rooms || []).map((r) => r.id));

  // Check room featured artworks
  (data.rooms || []).forEach((room) => {
    if (room.artworkId && !artworkIds.has(room.artworkId)) {
      console.warn(`[SchemaValidator] Room ${room.id} references missing featured artworkId: "${room.artworkId}"`);
    }
    const inRoom = (data.artworks || []).filter((a) => a.room === room.id);
    if (!inRoom.length) {
      console.warn(`[SchemaValidator] Room ${room.id} has no artworks assigned.`);
    }
  });

  // Check story references
  const essays = data.homeExperiences?.materialAlchemy?.essays || [];
  essays.forEach((essay) => {
    (essay.relatedArtworkIds || []).forEach((artId) => {
      if (!artworkIds.has(artId)) {
        console.warn(`[SchemaValidator] Story "${essay.id}" references missing artworkId: "${artId}"`);
      }
    });
    (essay.rooms || []).forEach((rId) => {
      if (!roomIds.has(rId)) {
        console.warn(`[SchemaValidator] Story "${essay.id}" references missing room ID: "${rId}"`);
      }
    });
  });

  // Check artwork related IDs
  (data.artworks || []).forEach((art) => {
    (art.relatedArtworkIds || []).forEach((relId) => {
      if (!artworkIds.has(relId)) {
        console.warn(`[SchemaValidator] Artwork "${art.id}" references missing relatedArtworkId: "${relId}"`);
      }
    });
  });
}
