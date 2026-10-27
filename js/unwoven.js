/**
 * UNWOVEN.JS — Infinite Ribbon Loom Carousel
 * Adapted from Clément Grellier's Unwoven for ÉTHÉRÉ Art Gallery.
 * Each artwork card unravels into 26 horizontal threads when approaching the viewport edges,
 * bleaching seamlessly into the page background color via a single unified color variable.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { isReducedMotion, router } from './logic.js';

const CONFIG = {
  threads: 26, // Horizontal ribbons per card
  segments: 24, // Subdivisions per ribbon for flutter waves
  cardMaxHeight: 740, // px, clamped against viewport height
  cardAspect: 0.72, // 3:4.16 portrait aspect ratio
  cardGapRatio: 0.14, // Gap between cards
  cardRadius: 18, // px corner radius (SDF)
  scrollSpeed: 85, // px per second at rest (calm curatorial drift)
  flingMax: 4200, // px per second cap after drag
  tearZoneRatio: 0.28, // Viewport edge ratio where threads start splaying
  tearZoneMax: 480, // Max px for tear zone
};

const VERTEX_SHADER = /* glsl */ `
  attribute float aThread;
  attribute float aRim;

  uniform float uTime;
  uniform float uHalfWidth;
  uniform float uZone;
  uniform float uStrength;
  uniform float uWobble;
  uniform float uSeed;

  varying vec2  vUv;
  varying float vTear;
  varying float vRim;
  varying float vRandom;

  float hash(float n) {
    return fract(sin(n * 127.1 + 311.7) * 43758.5453);
  }

  void main() {
    vUv = uv;
    vRim = aRim;

    vec4 world = modelMatrix * vec4(position, 1.0);
    float x = world.x;

    float left  = 1.0 - smoothstep(-uHalfWidth, -uHalfWidth + uZone, x);
    float right = smoothstep(uHalfWidth - uZone, uHalfWidth, x);
    float tear  = max(left, right) * uStrength;

    float direction = x < 0.0 ? -1.0 : 1.0;

    float randomA = hash(aThread + uSeed * 57.0);
    float randomB = hash(aThread * 3.7 + uSeed * 91.0);
    vRandom = randomA;

    float t = pow(tear, 1.4);

    // Each ribbon escapes at its own independent velocity
    float run = t * (60.0 + randomA * 420.0);
    run *= 0.85 + 0.15 * sin(uTime * (1.0 + randomB * 2.0) + randomA * 6.2831);
    world.x += direction * run;

    // Ribbons drift vertically out of rows
    world.y += (randomA - 0.5) * 170.0 * t * t;

    // Organic ribbon flutter wave along X
    world.y += sin(world.x * 0.02 + uTime * (1.6 + randomA * 2.2) + randomA * 6.2831)
               * (5.0 + 13.0 * randomA) * t * uWobble;

    vTear = tear;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;
  uniform vec2  uCardSize;
  uniform float uRadius;
  uniform float uImageAspect;
  uniform vec3  uBleachColor; // Single source of truth: matches page background color!

  varying vec2  vUv;
  varying float vTear;
  varying float vRim;
  varying float vRandom;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    float tear = vTear;
    float rim  = abs(vRim);

    // 1. Shrink visible ribbon core during tear
    float coreWidth = mix(0.82, 0.16 + vRandom * 0.12, smoothstep(0.0, 0.85, tear));
    float threadAlpha = 1.0 - smoothstep(coreWidth - 0.10, coreWidth + 0.06, rim);
    threadAlpha = mix(1.0, threadAlpha, smoothstep(0.03, 0.30, tear));

    // 2. Card silhouette via SDF rounded rect
    vec2 p = (vUv - 0.5) * uCardSize;
    float cardAlpha = 1.0 - smoothstep(-1.5, 0.5, sdRoundBox(p, uCardSize * 0.5, uRadius));

    float fade  = 1.0 - smoothstep(0.75, 1.0, tear) * 0.7;
    float alpha = cardAlpha * threadAlpha * fade;
    if (alpha < 0.003) discard;

    // 3. Sample image with cover fitting
    float cardAspect = uCardSize.x / uCardSize.y;
    vec2 scale = cardAspect > uImageAspect
      ? vec2(1.0, uImageAspect / cardAspect)
      : vec2(cardAspect / uImageAspect, 1.0);
    vec3 color = texture2D(uMap, (vUv - 0.5) * scale + 0.5).rgb;

    // 4. Subtle physical ribbon glint & edge shading
    color *= 1.0 - tear * 0.35 * rim * rim;
    color += tear * 0.16 * (1.0 - smoothstep(0.0, 0.45, rim));

    // 5. Bleach seamlessly into the page background color (Unified theme variable!)
    color = mix(color, uBleachColor, smoothstep(0.55, 1.0, tear) * 0.85);

    gl_FragColor = vec4(color, alpha);
  }
`;

function buildRibbonGeometry(width, height, threads, segments) {
  const columns = segments + 1;
  const perThread = columns * 2;
  const total = threads * perThread;

  const positions = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
  const rims = new Float32Array(total);
  const threadIds = new Float32Array(total);
  const indices = [];

  let v = 0;
  for (let t = 0; t < threads; t++) {
    for (let row = 0; row < 2; row++) {
      const vy = (t + row) / threads;
      for (let c = 0; c < columns; c++) {
        const ux = c / segments;
        positions[v * 3 + 0] = (ux - 0.5) * width;
        positions[v * 3 + 1] = (vy - 0.5) * height;
        positions[v * 3 + 2] = 0;
        uvs[v * 2 + 0] = ux;
        uvs[v * 2 + 1] = vy;
        rims[v] = row === 0 ? -1 : 1;
        threadIds[v] = t;
        v++;
      }
    }

    const base = t * perThread;
    for (let c = 0; c < segments; c++) {
      const bl = base + c;
      const br = base + c + 1;
      const tl = base + columns + c;
      const tr = base + columns + c + 1;
      indices.push(bl, br, tl, br, tr, tl);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('aRim', new THREE.BufferAttribute(rims, 1));
  geometry.setAttribute('aThread', new THREE.BufferAttribute(threadIds, 1));
  geometry.setIndex(indices);
  return geometry;
}

export class UnwovenCarousel {
  constructor(container, artworks, initialFadeRgb = [0.957, 0.941, 0.910], options = {}) {
    this.container = container;
    this.artworks = artworks;
    this.fadeRgb = initialFadeRgb;
    this.onArtworkSelect = options.onArtworkSelect || null;

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.geometry = null;
    this.cards = [];
    this.slots = [];
    this.sharedUniforms = null;
    this.tickerFn = null;

    this.viewportWidth = 0;
    this.viewportHeight = 0;
    this.cardWidth = 0;
    this.cardHeight = 0;
    this.pitch = 0;
    this.stripSpan = 0;

    this.offset = 0;
    this.motion = { velocity: 0 };
    this.dragging = false;
    this.lastX = 0;
    this.lastTime = 0;
    this.dragVelocity = 0;
    this.downX = 0;
    this.downY = 0;

    this.onResize = this.onResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onThemeChanged = this.onThemeChanged.bind(this);
  }

  init() {
    if (isReducedMotion()) {
      console.info('[Unwoven] Reduced motion active, displaying accessible static layout.');
      return false;
    }

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      console.warn('[Unwoven] WebGL initialization failed, fallback active:', e);
      return false;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);

    const reduce = isReducedMotion();
    this.sharedUniforms = {
      uTime: { value: 0 },
      uHalfWidth: { value: 1 },
      uZone: { value: 1 },
      uStrength: { value: 0 },
      uWobble: { value: reduce ? 0 : 1 },
      uCardSize: { value: new THREE.Vector2(1, 1) },
      uRadius: { value: CONFIG.cardRadius },
      uBleachColor: { value: new THREE.Vector3(this.fadeRgb[0], this.fadeRgb[1], this.fadeRgb[2]) },
    };

    this.initSlots();
    this.resize();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('themeChanged', this.onThemeChanged);

    this.container.addEventListener('pointerdown', this.onPointerDown);
    this.container.addEventListener('pointermove', this.onPointerMove);
    this.container.addEventListener('pointerup', this.onPointerUp);
    this.container.addEventListener('pointercancel', this.onPointerUp);

    // Initial entrance tween
    const baseSpeed = reduce ? 0 : CONFIG.scrollSpeed;
    gsap.to(this.motion, { velocity: baseSpeed, duration: 2.2, ease: 'power2.out', delay: 0.2 });
    gsap.to(this.sharedUniforms.uStrength, { value: 1, duration: 1.8, ease: 'power3.inOut', delay: 0.1 });

    // Render loop
    this.tickerFn = (time, deltaMS) => {
      if (!this.dragging) {
        this.offset += this.motion.velocity * (deltaMS / 1000);
      }
      this.sharedUniforms.uTime.value = time;

      const half = this.stripSpan / 2;
      for (const card of this.cards) {
        const x = (((card.baseX - this.offset) % this.stripSpan) + this.stripSpan) % this.stripSpan;
        card.mesh.position.x = x - half;
      }

      this.renderer.render(this.scene, this.camera);
    };

    gsap.ticker.add(this.tickerFn);
    return true;
  }

  initSlots() {
    const loader = new THREE.TextureLoader();

    this.slots = this.artworks.map((art, i) => {
      // Create empty 1x1 placeholder texture while image loads
      const texture = loader.load(art.image, (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        material.uniforms.uImageAspect.value = (tex.image.naturalWidth || 3) / (tex.image.naturalHeight || 4);
      });

      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uMap: { value: texture },
          uSeed: { value: (i + 1) * 0.731 },
          uImageAspect: { value: art.aspectRatio || 0.75 },
          uTime: this.sharedUniforms.uTime,
          uHalfWidth: this.sharedUniforms.uHalfWidth,
          uZone: this.sharedUniforms.uZone,
          uStrength: this.sharedUniforms.uStrength,
          uWobble: this.sharedUniforms.uWobble,
          uCardSize: this.sharedUniforms.uCardSize,
          uRadius: this.sharedUniforms.uRadius,
          uBleachColor: this.sharedUniforms.uBleachColor,
        },
      });

      return { artwork: art, texture, material };
    });
  }

  rebuildStrip() {
    this.cards.forEach((c) => this.scene.remove(c.mesh));
    this.cards = [];
    if (this.geometry) this.geometry.dispose();

    this.geometry = buildRibbonGeometry(this.cardWidth, this.cardHeight, CONFIG.threads, CONFIG.segments);

    const count = Math.max(8, Math.ceil((this.viewportWidth + this.pitch * 3) / this.pitch));
    this.stripSpan = count * this.pitch;

    for (let i = 0; i < count; i++) {
      const slot = this.slots[i % this.slots.length];
      const mesh = new THREE.Mesh(this.geometry, slot.material);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.cards.push({ mesh, baseX: i * this.pitch, artwork: slot.artwork });
    }
  }

  resize() {
    if (!this.container || !this.renderer) return;

    this.viewportWidth = this.container.clientWidth || window.innerWidth;
    this.viewportHeight = this.container.clientHeight || window.innerHeight;

    this.renderer.setSize(this.viewportWidth, this.viewportHeight);
    this.camera.left = -this.viewportWidth / 2;
    this.camera.right = this.viewportWidth / 2;
    this.camera.top = this.viewportHeight / 2;
    this.camera.bottom = -this.viewportHeight / 2;
    this.camera.updateProjectionMatrix();

    this.cardHeight = Math.min(CONFIG.cardMaxHeight, this.viewportHeight * 0.74);
    this.cardWidth = this.cardHeight * CONFIG.cardAspect;
    this.pitch = this.cardWidth + Math.max(28, this.cardWidth * CONFIG.cardGapRatio);

    this.sharedUniforms.uHalfWidth.value = this.viewportWidth / 2;
    this.sharedUniforms.uZone.value = Math.min(this.viewportWidth * CONFIG.tearZoneRatio, CONFIG.tearZoneMax);
    this.sharedUniforms.uCardSize.value.set(this.cardWidth, this.cardHeight);

    this.rebuildStrip();
  }

  onResize() {
    this.resize();
  }

  onThemeChanged(e) {
    if (e.detail?.unwovenFadeRgb && this.sharedUniforms?.uBleachColor) {
      const rgb = e.detail.unwovenFadeRgb;
      this.sharedUniforms.uBleachColor.value.set(rgb[0], rgb[1], rgb[2]);
    }
  }

  onPointerDown(e) {
    this.dragging = true;
    this.lastX = e.clientX;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.lastTime = performance.now();
    this.dragVelocity = 0;

    this.container.classList.add('is-dragging');
    try {
      this.container.setPointerCapture(e.pointerId);
    } catch (_) {}
    gsap.killTweensOf(this.motion);
  }

  onPointerMove(e) {
    if (!this.dragging) return;
    const now = performance.now();
    const dx = e.clientX - this.lastX;
    const dt = Math.max(1, now - this.lastTime) / 1000;

    this.offset -= dx;
    this.dragVelocity += (-dx / dt - this.dragVelocity) * 0.35;

    this.lastX = e.clientX;
    this.lastTime = now;
  }

  onPointerUp(e) {
    if (!this.dragging) return;
    this.dragging = false;
    this.container.classList.remove('is-dragging');

    try {
      this.container.releasePointerCapture(e.pointerId);
    } catch (_) {}

    const dist = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
    if (dist < 8) {
      this.handleClick(e.clientX, e.clientY);
      return;
    }

    const baseSpeed = isReducedMotion() ? 0 : CONFIG.scrollSpeed;
    this.motion.velocity = gsap.utils.clamp(-CONFIG.flingMax, CONFIG.flingMax, this.dragVelocity);
    gsap.to(this.motion, { velocity: baseSpeed, duration: 2.2, ease: 'power3.out' });
  }

  handleClick(clientX, clientY) {
    const rect = this.container.getBoundingClientRect();
    const clickX = clientX - rect.left - rect.width / 2;
    const clickY = -(clientY - rect.top - rect.height / 2);

    // Find clicked card
    const halfWidth = this.cardWidth / 2;
    const halfHeight = this.cardHeight / 2;

    for (const card of this.cards) {
      const cx = card.mesh.position.x;
      if (
        clickX >= cx - halfWidth &&
        clickX <= cx + halfWidth &&
        clickY >= -halfHeight &&
        clickY <= halfHeight
      ) {
        if (card.artwork?.id) {
          window.dispatchEvent(new CustomEvent('artworkSelected', { detail: { artwork: card.artwork } }));
          if (typeof this.onArtworkSelect === 'function') {
            this.onArtworkSelect(card.artwork);
          }
          break;
        }
      }
    }
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('themeChanged', this.onThemeChanged);

    if (this.container) {
      this.container.removeEventListener('pointerdown', this.onPointerDown);
      this.container.removeEventListener('pointermove', this.onPointerMove);
      this.container.removeEventListener('pointerup', this.onPointerUp);
      this.container.removeEventListener('pointercancel', this.onPointerUp);
    }

    if (this.tickerFn) {
      gsap.ticker.remove(this.tickerFn);
    }

    if (this.geometry) {
      this.geometry.dispose();
    }

    this.slots.forEach((s) => {
      s.material.dispose();
      s.texture.dispose();
    });

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
