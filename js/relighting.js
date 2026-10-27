/**
 * RELIGHTING.JS — 3D Surface Relighting via Depth Maps & Dynamic Self-Shadowing
 * Inspired by Dominik Fojcik's Relighting Images (Codrops MIT License),
 * re-architected for ÉTHÉRÉ Art Gallery with responsive touch & interactive sliders.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { isReducedMotion } from './logic.js';

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;
  uniform sampler2D uDepthMap;
  uniform vec2  uResolution;
  uniform vec3  uLightPos;       // In plane space: x [-1, 1], y [-1, 1], z elevation
  uniform vec3  uLightColor;     // Museum light spectrum
  uniform float uLightIntensity; // Brightness scale
  uniform float uAmbientIntensity;
  uniform float uDisplacementScale;
  uniform float uNormalScale;
  uniform float uDetailScale;
  uniform float uShadowIntensity;
  uniform float uShadowSoftness;
  uniform float uShowNormals;

  varying vec2 vUv;

  void main() {
    vec4 baseColor = texture2D(uMap, vUv);
    float depth = texture2D(uDepthMap, vUv).r;

    // --- 1. Compute Crisp, Undistorted Surface Normal from Depth Gradient ---
    vec2 texelStep = vec2(1.5) / uResolution;
    float depthL = texture2D(uDepthMap, vUv - vec2(texelStep.x, 0.0)).r;
    float depthR = texture2D(uDepthMap, vUv + vec2(texelStep.x, 0.0)).r;
    float depthB = texture2D(uDepthMap, vUv - vec2(0.0, texelStep.y)).r;
    float depthT = texture2D(uDepthMap, vUv + vec2(0.0, texelStep.y)).r;

    vec2 slope = vec2(depthR - depthL, depthT - depthB) * 0.5 * uNormalScale * 3.2;

    // --- 2. High-Frequency Canvas & Brushstroke Micro-Detail ---
    vec2 detailStep = vec2(1.8) / uResolution;
    float lumL = dot(texture2D(uMap, vUv - vec2(detailStep.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float lumR = dot(texture2D(uMap, vUv + vec2(detailStep.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
    float lumB = dot(texture2D(uMap, vUv - vec2(0.0, detailStep.y)).rgb, vec3(0.299, 0.587, 0.114));
    float lumT = dot(texture2D(uMap, vUv + vec2(0.0, detailStep.y)).rgb, vec3(0.299, 0.587, 0.114));

    vec2 detail = vec2(lumR - lumL, lumT - lumB) * 0.5 * uDetailScale * 1.6;

    vec3 normal = normalize(vec3(-(slope.x + detail.x), -(slope.y + detail.y), 1.0));

    // Scientific 3D Conservation: View Surface Normal Vector in RGB
    if (uShowNormals > 0.5) {
      gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
      return;
    }

    // --- 3. Light Vector & Subtle Attenuation ---
    vec3 surfacePos = vec3((vUv - 0.5) * 2.0, (depth - 1.0) * uDisplacementScale);
    vec3 lightVec = uLightPos - surfacePos;
    float lightDist = length(lightVec);
    vec3 lightDir = normalize(lightVec);

    float attenuation = 1.0 / (1.0 + 0.25 * lightDist + 0.45 * lightDist * lightDist);

    // --- 4. 12-Step Self-Shadowing Raymarch (Natural, Soft Penumbra) ---
    float surfaceDepth = depth;
    float remainingDepth = 1.0 - surfaceDepth;
    vec2 rayOffset = (lightDir.xy / max(lightDir.z, 0.2)) * uDisplacementScale * remainingDepth * 0.25;

    float maxOcclusion = 0.0;
    for (int i = 1; i <= 12; i++) {
      float progress = float(i) / 12.0;
      float rayZ = surfaceDepth + remainingDepth * progress;
      float blocker = texture2D(uDepthMap, vUv + rayOffset * progress).r;
      float penumbra = uShadowSoftness * (progress * 2.5 + 1.0);
      float occlusion = clamp((blocker - rayZ) / penumbra, 0.0, 1.0);
      maxOcclusion = max(maxOcclusion, occlusion);
    }

    float shadow = 1.0 - maxOcclusion * uShadowIntensity * step(0.0, lightDir.z);

    // --- 5. Museum-Grade Diffuse & Satin Varnish Specular (Zero Harsh Glare) ---
    float NdotL = max(dot(normal, lightDir), 0.0);
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfVec = normalize(lightDir + viewDir);
    float NdotH = max(dot(normal, halfVec), 0.0);
    
    // Soft satin museum dammar varnish highlight (eliminates blinding plastic whiteout)
    float specular = pow(NdotH, 48.0) * 0.06;

    // Controlled directional raking light (scaled so total brightness never clips)
    vec3 diffuse = baseColor.rgb * uLightColor * (uLightIntensity * NdotL * attenuation * shadow * 0.55);
    vec3 ambient = baseColor.rgb * uAmbientIntensity;
    vec3 specHighlight = uLightColor * (specular * attenuation * shadow);

    // Sum ambient + soft diffuse + subtle varnish sheen
    vec3 finalRgb = ambient + diffuse + specHighlight;

    // Smooth photographic highlight preservation (soft shoulder rolloff)
    finalRgb = clamp(finalRgb, 0.0, 1.0);

    gl_FragColor = vec4(finalRgb, baseColor.a);
  }
`;

/**
 * 24-HOUR CIRCADIAN SOLAR SIMULATION CALCULATOR
 * Simulates physical daylight angle, Kelvin temperature, intensity and ambient sky dome
 */
export function calculateCircadianLight(hour) {
  const h = ((parseFloat(hour) % 24) + 24) % 24;
  let x, y, z, colorHex, intensity, ambient, label, icon;

  if (h >= 5.0 && h < 8.0) {
    // 05:00 - 08:00 Bình minh sương mai (Dawn)
    const t = (h - 5.0) / 3.0;
    x = -0.85 + t * 0.35;
    y = 0.15 + t * 0.25;
    z = 0.7 + t * 0.3;
    colorHex = '#f6dcc4';
    intensity = 0.44 + t * 0.08;
    ambient = 0.62 + t * 0.08;
    label = '06:00 Sương Mai (Bình Minh)';
    icon = '🌅';
  } else if (h >= 8.0 && h < 11.5) {
    // 08:00 - 11:30 Nắng ban mai ấm áp (Morning Warmth)
    const t = (h - 8.0) / 3.5;
    x = -0.5 + t * 0.4;
    y = 0.4 + t * 0.2;
    z = 1.0 + t * 0.4;
    colorHex = '#fff1d6';
    intensity = 0.52;
    ambient = 0.70;
    label = '09:30 Nắng Ban Mai Vòm Kính';
    icon = '☀️';
  } else if (h >= 11.5 && h < 14.5) {
    // 11:30 - 14:30 Giếng trời đỉnh đầu Louvre (Zenith Noon)
    const t = (h - 11.5) / 3.0;
    x = -0.1 + t * 0.2;
    y = 0.6 - t * 0.1;
    z = 1.6;
    colorHex = '#ffffff';
    intensity = 0.48;
    ambient = 0.74;
    label = '12:00 Giếng Trời Đỉnh Đầu';
    icon = '☀️';
  } else if (h >= 14.5 && h < 17.0) {
    // 14:30 - 17:00 Nắng chiều tà xiên góc (Afternoon Raking)
    const t = (h - 14.5) / 2.5;
    x = 0.1 + t * 0.5;
    y = 0.5 - t * 0.2;
    z = 1.4 - t * 0.5;
    colorHex = '#ffdfab';
    intensity = 0.54;
    ambient = 0.68;
    label = '15:30 Ánh Chiều Xiên Chiaroscuro';
    icon = '🌤️';
  } else if (h >= 17.0 && h < 19.5) {
    // 17:00 - 19:30 Hoàng hôn rực rỡ (Sunset Splendor)
    const t = (h - 17.0) / 2.5;
    x = 0.6 + t * 0.28;
    y = 0.3 - t * 0.15;
    z = 0.9 - t * 0.3;
    colorHex = '#ff9e59';
    intensity = 0.58;
    ambient = 0.54;
    label = '17:30 Hoàng Hôn Hổ Phách';
    icon = '🌇';
  } else if (h >= 19.5 && h < 23.5) {
    // 19:30 - 23:30 Đèn bảo tồn halogen bảo tàng đêm (Museum Halogen Spotlight)
    x = 0.25;
    y = 0.35;
    z = 1.1;
    colorHex = '#f5dfbe';
    intensity = 0.50;
    ambient = 0.56;
    label = '21:00 Đèn Bảo Tồn Ban Đêm';
    icon = '🕯️';
  } else {
    // 23:30 - 05:00 Ánh trăng huyền ảo nửa đêm (Moonlit Nocturne)
    x = -0.35;
    y = 0.45;
    z = 0.85;
    colorHex = '#a5c7eb';
    intensity = 0.38;
    ambient = 0.48;
    label = '02:00 Ánh Trăng Tĩnh Lặng';
    icon = '🌙';
  }

  return { x, y, z, colorHex, intensity, ambient, label, icon, hour: h };
}

export class RelightingStage {
  constructor(mountElement, artwork, options = {}) {
    this.mount = mountElement;
    this.artwork = artwork;
    this.options = {
      lightColor: options.lightColor || '#f6eedf',
      intensity: options.intensity || 0.45,
      elevation: options.elevation || 1.1,
      ...options,
    };

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.material = null;
    this.mesh = null;
    this.animationId = null;
    this.imageAspect = 1.0;

    this.targetLightX = 0.2;
    this.targetLightY = 0.4;
    this.currentLightX = 0.2;
    this.currentLightY = 0.4;

    this.onPointerMove = this.onPointerMove.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  computePlaneDimensions(width, height) {
    const canvasAspect = width / height;
    const fitMargin = 0.92; // Museum frame matting margin
    let planeW, planeH;

    if (this.imageAspect >= canvasAspect) {
      planeW = 2.0 * fitMargin;
      planeH = (2.0 * fitMargin) * (canvasAspect / this.imageAspect);
    } else {
      planeH = 2.0 * fitMargin;
      planeW = (2.0 * fitMargin) * (this.imageAspect / canvasAspect);
    }
    return { planeW, planeH };
  }

  async init() {
    if (isReducedMotion()) {
      console.info('[Relighting] Reduced motion requested, showing static curated artwork.');
      return false;
    }

    const rect = this.mount.getBoundingClientRect();
    const width = Math.max(100, rect.width || 600);
    const height = Math.max(100, rect.height || 800);

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setClearColor(0x000000, 0);
    } catch (e) {
      console.warn('[Relighting] WebGL init failed:', e);
      return false;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';

    // Clear static fallback img and attach WebGL canvas
    this.mount.innerHTML = '';
    this.mount.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;

    // Load diffuse & depth textures
    const loader = new THREE.TextureLoader();
    const map = await new Promise((res) => {
      loader.load(this.artwork.image, res);
    });

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    map.generateMipmaps = true;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.magFilter = THREE.LinearFilter;
    map.anisotropy = Math.min(16, maxAniso);

    const img = map.image;
    this.imageAspect = (img?.naturalWidth || img?.width || 1) / (img?.naturalHeight || img?.height || 1);

    // Load depth map (or fallback to diffuse if depth missing)
    const depthUrl = this.artwork.depth || this.artwork.depthMap || this.artwork.image;
    const depthMap = await new Promise((res) => {
      loader.load(depthUrl, res);
    });
    depthMap.generateMipmaps = true;
    depthMap.minFilter = THREE.LinearMipmapLinearFilter;
    depthMap.magFilter = THREE.LinearFilter;

    const colorHex = new THREE.Color(this.options.lightColor);

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uMap: { value: map },
        uDepthMap: { value: depthMap },
        uResolution: { value: new THREE.Vector2(width, height) },
        uLightPos: { value: new THREE.Vector3(this.currentLightX, this.currentLightY, this.options.elevation) },
        uLightColor: { value: new THREE.Vector3(colorHex.r, colorHex.g, colorHex.b) },
        uLightIntensity: { value: this.options.intensity || 0.42 },
        uAmbientIntensity: { value: 0.74 },
        uDisplacementScale: { value: 0.035 },
        uNormalScale: { value: 0.85 },
        uDetailScale: { value: 0.55 },
        uShadowIntensity: { value: 0.35 },
        uShadowSoftness: { value: 0.06 },
        uShowNormals: { value: 0.0 },
      },
    });

    const { planeW, planeH } = this.computePlaneDimensions(width, height);
    const geometry = new THREE.PlaneGeometry(planeW, planeH);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);

    // Event listeners
    this.mount.addEventListener('pointermove', this.onPointerMove);
    this.mount.addEventListener('pointerdown', this.onPointerMove);
    window.addEventListener('resize', this.onResize);

    // Initial smooth entrance animation for light (gentle museum fade-in, zero flash)
    gsap.fromTo(
      this.material.uniforms.uLightIntensity,
      { value: 0.15 },
      { value: this.options.intensity, duration: 1.2, ease: 'power2.out' }
    );

    // Animation Loop with smooth, gentle museum-grade light tracking
    const renderLoop = () => {
      // Lerp light position towards pointer with gentle, silky damping (0.065)
      this.currentLightX += (this.targetLightX - this.currentLightX) * 0.065;
      this.currentLightY += (this.targetLightY - this.currentLightY) * 0.065;
      this.material.uniforms.uLightPos.value.x = this.currentLightX;
      this.material.uniforms.uLightPos.value.y = this.currentLightY;

      this.renderer.render(this.scene, this.camera);
      this.animationId = requestAnimationFrame(renderLoop);
    };

    this.animationId = requestAnimationFrame(renderLoop);
    return true;
  }

  onPointerMove(e) {
    const rect = this.mount.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    this.targetLightX = x * 1.25;
    this.targetLightY = y * 1.25;
  }

  setLightIntensity(val) {
    if (this.material) {
      this.material.uniforms.uLightIntensity.value = parseFloat(val);
    }
  }

  setLightElevation(val) {
    if (this.material) {
      this.material.uniforms.uLightPos.value.z = parseFloat(val);
    }
  }

  setLightColor(hex) {
    if (this.material) {
      const c = new THREE.Color(hex);
      this.material.uniforms.uLightColor.value.set(c.r, c.g, c.b);
    }
  }

  setLightPosition(x, y) {
    this.targetLightX = x * 1.25;
    this.targetLightY = y * 1.25;
  }

  setCircadianHour(hour, animate = true) {
    const data = calculateCircadianLight(hour);
    this.targetLightX = data.x;
    this.targetLightY = data.y;

    if (this.material) {
      const c = new THREE.Color(data.colorHex);
      if (animate && window.gsap) {
        gsap.to(this.material.uniforms.uLightColor.value, {
          r: c.r,
          g: c.g,
          b: c.b,
          duration: 0.6,
          ease: 'power2.out',
        });
        gsap.to(this.material.uniforms.uLightIntensity, {
          value: data.intensity,
          duration: 0.6,
          ease: 'power2.out',
        });
        gsap.to(this.material.uniforms.uAmbientIntensity, {
          value: data.ambient,
          duration: 0.6,
          ease: 'power2.out',
        });
        gsap.to(this.material.uniforms.uLightPos.value, {
          z: data.z,
          duration: 0.6,
          ease: 'power2.out',
        });
      } else {
        this.material.uniforms.uLightColor.value.set(c.r, c.g, c.b);
        this.material.uniforms.uLightIntensity.value = data.intensity;
        this.material.uniforms.uAmbientIntensity.value = data.ambient;
        this.material.uniforms.uLightPos.value.z = data.z;
      }
    }
    return data;
  }

  toggleNormalMap() {
    if (this.material) {
      const cur = this.material.uniforms.uShowNormals.value;
      this.material.uniforms.uShowNormals.value = cur > 0.5 ? 0.0 : 1.0;
      return this.material.uniforms.uShowNormals.value > 0.5;
    }
    return false;
  }

  setZoom(scaleFactor) {
    if (this.mesh) {
      const factor = Math.max(1.0, Math.min(2.5, parseFloat(scaleFactor)));
      gsap.to(this.mesh.scale, { x: factor, y: factor, duration: 0.5, ease: 'power2.out' });
    }
  }

  onResize() {
    if (!this.mount || !this.renderer) return;
    const rect = this.mount.getBoundingClientRect();
    const width = Math.max(100, rect.width);
    const height = Math.max(100, rect.height);

    this.renderer.setSize(width, height);
    if (this.material) {
      this.material.uniforms.uResolution.value.set(width, height);
    }
    if (this.mesh && this.imageAspect) {
      const { planeW, planeH } = this.computePlaneDimensions(width, height);
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(planeW, planeH);
    }
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.mount) {
      this.mount.removeEventListener('pointermove', this.onPointerMove);
      this.mount.removeEventListener('pointerdown', this.onPointerMove);
    }
    window.removeEventListener('resize', this.onResize);

    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.material.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
