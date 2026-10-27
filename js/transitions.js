/**
 * TRANSITIONS.JS — Persistent WebGPU & WebGL Page Transition Coordinator
 * Inspired by Codrops Persistent Page Transitions, redesigned for ÉTHÉRÉ.
 * Provides smooth 60fps persistent 3D plane morphing with automatic CSS fallback.
 */

import * as THREE from 'three/webgpu';
import { Fn, uv, uniform, vec2 } from 'three/tsl';
import gsap from 'gsap';
import { isReducedMotion } from './logic.js';

// Corner radius for 3D image planes
const CORNER_RADIUS = 12;
const CAMERA_DISTANCE = 1000;

/**
 * Builds an antialiased rounded rectangle opacity node via TSL
 */
function createRoundedRectOpacityNode(sizeUniform, radiusUniform, opacityUniform) {
  const mask = Fn(() => {
    const half = sizeUniform.mul(0.5);
    const r = radiusUniform.min(half.x).min(half.y);
    const p = uv().sub(0.5).mul(sizeUniform);
    const q = p.abs().sub(half).add(r);
    const dist = q.max(vec2(0.0)).length().add(q.x.max(q.y).min(0.0)).sub(r);
    return dist.smoothstep(-1.0, 1.0).oneMinus();
  })();
  return mask.mul(opacityUniform);
}

export class TransitionStage {
  constructor(container) {
    this.container = container;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.geometry = null;
    this.planes = new Map(); // Keyed by artwork id
    this.textureCache = new Map();
    this.radiusUniform = uniform(CORNER_RADIUS);
    this.fadeColorUniform = uniform(new THREE.Vector3(0.957, 0.941, 0.910));
    this.isReady = false;
    this.isFallbackMode = false;
    this.curtain = document.getElementById('transition-curtain');

    this.onResize = this.onResize.bind(this);
  }

  async init(graphicsMode = 'webgpu') {
    if (graphicsMode === 'cpu' || isReducedMotion()) {
      this.enableFallbackMode('Reduced motion or hardware limitation detected');
      return;
    }

    try {
      this.renderer = new THREE.WebGPURenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      await this.renderer.init();

      this.scene = new THREE.Scene();
      this.geometry = new THREE.PlaneGeometry(1, 1);

      this.setupCamera();
      this.container.appendChild(this.renderer.domElement);

      window.addEventListener('resize', this.onResize);
      this.isReady = true;

      // Start render loop
      this.renderer.setAnimationLoop(() => this.render());
    } catch (err) {
      console.warn('[TransitionStage] WebGPU init failed, switching to CSS fallback:', err);
      this.enableFallbackMode(err.message);
    }
  }

  setupCamera() {
    const fov = 2 * Math.atan(window.innerHeight / 2 / CAMERA_DISTANCE) * (180 / Math.PI);
    this.camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 100, 3000);
    this.camera.position.set(0, 0, CAMERA_DISTANCE);
    this.camera.lookAt(0, 0, 0);
  }

  enableFallbackMode(reason) {
    this.isFallbackMode = true;
    document.body.classList.add('fallback-mode');
    console.info(`[TransitionStage] Running in Accessible CSS Fallback Mode (${reason})`);
  }

  /**
   * Lazy load texture on-demand (fulfilling requirement:
   * "chỉ nạp texture khi cần thay vì nạp hết lúc khởi động")
   */
  async loadTextureOnDemand(url) {
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url);
    }
    return new Promise((resolve) => {
      const loader = new THREE.TextureLoader();
      loader.load(url, (tex) => {
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        this.textureCache.set(url, tex);
        resolve(tex);
      });
    });
  }

  /**
   * Register or acquire a persistent 3D plane for an artwork
   */
  async getOrCreatePlane(artwork) {
    if (this.isFallbackMode || !this.isReady) return null;

    if (this.planes.has(artwork.id)) {
      return this.planes.get(artwork.id);
    }

    const texture = await this.loadTextureOnDemand(artwork.image);
    const sizeUniform = uniform(new THREE.Vector2(1, 1));
    const opacityUniform = uniform(0);

    const material = new THREE.MeshBasicNodeMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    material.opacityNode = createRoundedRectOpacityNode(sizeUniform, this.radiusUniform, opacityUniform);

    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.visible = false;
    this.scene.add(mesh);

    const planeData = {
      id: artwork.id,
      mesh,
      material,
      sizeUniform,
      opacityUniform,
      artwork,
      aspect: artwork.aspectRatio || 0.75,
    };

    this.planes.set(artwork.id, planeData);
    return planeData;
  }

  /**
   * Convert DOM BoundingClientRect to 3D world space (1:1 pixel mapping at Z=0)
   */
  domRectToWorld(rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = rect.left + rect.width / 2 - vw / 2;
    const y = -(rect.top + rect.height / 2 - vh / 2);
    return { x, y, width: rect.width, height: rect.height };
  }

  /**
   * Execute Page Transition between views
   */
  async performTransition({ fromView, toView, targetArtwork = null, domTarget = null }) {
    if (this.isFallbackMode || isReducedMotion() || !this.curtain) {
      // Accessible CSS cross-fade transition
      return new Promise((resolve) => {
        if (!this.curtain) {
          resolve();
          return;
        }
        this.curtain.classList.add('is-active');
        setTimeout(() => {
          this.curtain.classList.remove('is-active');
          resolve();
        }, 350);
      });
    }

    // Morphing transition if artwork is present
    if (targetArtwork && domTarget) {
      const plane = await this.getOrCreatePlane(targetArtwork);
      if (plane) {
        const rect = domTarget.getBoundingClientRect();
        const world = this.domRectToWorld(rect);

        plane.mesh.visible = true;
        plane.opacityUniform.value = 1;

        return new Promise((resolve) => {
          gsap.timeline({ onComplete: resolve })
            .to(plane.mesh.position, {
              x: world.x,
              y: world.y,
              z: 0,
              duration: 0.7,
              ease: 'power3.out',
            })
            .to(plane.mesh.scale, {
              x: world.width,
              y: world.height,
              duration: 0.7,
              ease: 'power3.out',
              onUpdate: () => {
                plane.sizeUniform.value.set(plane.mesh.scale.x, plane.mesh.scale.y);
              },
            }, 0);
        });
      }
    }

    // Default fast cross-fade
    return new Promise((resolve) => {
      this.curtain.classList.add('is-active');
      setTimeout(() => {
        this.curtain.classList.remove('is-active');
        resolve();
      }, 300);
    });
  }

  setThemeColor(rgbArray) {
    if (this.fadeColorUniform && Array.isArray(rgbArray) && rgbArray.length >= 3) {
      this.fadeColorUniform.value.set(rgbArray[0], rgbArray[1], rgbArray[2]);
    }
  }

  onResize() {
    if (!this.renderer || !this.camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = 2 * Math.atan(h / 2 / CAMERA_DISTANCE) * (180 / Math.PI);
    this.camera.updateProjectionMatrix();
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
