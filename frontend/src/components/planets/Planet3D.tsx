import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import * as THREE from 'three';
import type { Visual } from '../../types/planet';

const IS_LOW =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches ||
    window.matchMedia?.('(max-width: 767px)').matches ||
    ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4 ||
    (navigator.hardwareConcurrency ?? 8) <= 4);

const MAX_DPR = IS_LOW ? 1 : 2;
const TARGET_FPS = IS_LOW ? 30 : 60;
const SPHERE_SEGMENTS = IS_LOW ? 48 : 128;
const ATMO_SEGMENTS = IS_LOW ? 32 : 64;
const RING_SEGMENTS = IS_LOW ? 96 : 256;
const STARS_COUNT = IS_LOW ? 500 : 3000;

const PLANET_R = 2;
const ATMO_R = PLANET_R * 1.2;
const RING_INNER = PLANET_R * 1.45;
const RING_OUTER = PLANET_R * 2.15;

const planetVertex = `
  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;

  void main() {
    vPos = normalize(position);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const QUALITY_DEFINES = IS_LOW
  ? '#define FBM_OCT 3\n#define RIDGE_OCT 2\n#define CRATERS 0\n#define FINE_GRAIN 0\n'
  : '#define FBM_OCT 5\n#define RIDGE_OCT 4\n#define CRATERS 1\n#define FINE_GRAIN 1\n';

const planetFragment = QUALITY_DEFINES + `
  uniform float uSpin;
  uniform float uTime;
  uniform vec3 uSeedOff;
  uniform float uSeedA;
  uniform float uSeedB;
  uniform vec3 uLightDir;

  uniform vec3 uColorBase;
  uniform vec3 uColorSecondary;
  uniform vec3 uColorAccent;
  uniform vec3 uColorDark;

  uniform int uArchetype;
  uniform float uNoiseScale;
  uniform float uMountain;
  uniform float uCraterDensity;
  uniform float uCraterDepth;
  uniform float uOcean;
  uniform float uIce;
  uniform float uCloud;
  uniform float uAtmo;
  uniform vec3 uAtmoColor;

  varying vec3 vPos;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;

  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.xxy + p3.yxx) * p3.zyx);
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(
      mix(mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), f.x),
          mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
      mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x),
          mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
      f.z);
  }

  const mat3 ROT = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);

  float fbm(vec3 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < FBM_OCT; i++) {
      s += a * vnoise(p);
      p = ROT * p * 2.02 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return s;
  }

  float ridged(vec3 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < RIDGE_OCT; i++) {
      float n = 1.0 - abs(vnoise(p) * 2.0 - 1.0);
      s += a * n * n;
      p = ROT * p * 2.1 + vec3(5.3, 1.1, 7.7);
      a *= 0.5;
    }
    return s;
  }

  mat3 rotY(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c);
  }

  vec2 craterLayer(vec3 p, float freq, float density, float depth, float salt) {
    vec3 x = p * freq;
    vec3 ic = floor(x);
    vec3 fc = x - ic;
    vec3 o0 = vec3(fc.x < 0.5 ? -1.0 : 0.0, fc.y < 0.5 ? -1.0 : 0.0, fc.z < 0.5 ? -1.0 : 0.0);
    float h = 0.0;
    float m = 0.0;
    for (int k = 0; k < 2; k++) {
      for (int j = 0; j < 2; j++) {
        for (int i = 0; i < 2; i++) {
          vec3 cell = ic + o0 + vec3(float(i), float(j), float(k));
          vec3 r = hash33(cell + salt);
          if (r.x > density) continue;
          vec3 c = cell + 0.2 + 0.6 * hash33(cell * 1.37 + salt + 7.1);
          float rad = mix(0.2, 0.46, r.y);
          float d = length(x - c) / rad;
          float bowl = 1.0 - smoothstep(0.55, 1.0, d);
          float t = (d - 1.04) / 0.17;
          float rim = exp(-t * t);
          float dep = depth * (0.55 + 0.45 * r.z);
          h += -bowl * dep + rim * dep * 0.45;
          m += bowl;
        }
      }
    }
    return vec2(h, min(m, 1.0));
  }

  vec2 terrain(vec3 p) {
    vec3 q = p + uSeedOff;
    float s = uNoiseScale;
    float cont = fbm(q * s * 0.6);
    float detail = fbm(q * s * 2.6 + 11.0);
    float mmask = smoothstep(0.40, 0.68, fbm(q * s * 0.5 + 3.0));
    float mnt = ridged(q * s * 1.1 + 5.0);
    float h = cont * 0.62 + detail * 0.16 + mnt * mmask * uMountain * 0.55;

#if CRATERS
    vec2 c1 = craterLayer(q, 3.4, uCraterDensity * 0.55, uCraterDepth * 0.22, 1.0);
    vec2 c2 = craterLayer(q, 8.0, uCraterDensity * 0.80, uCraterDepth * 0.15, 2.0);
    vec2 c3 = craterLayer(q, 19.0, uCraterDensity * 0.90, uCraterDepth * 0.09, 3.0);
    float cm = max(max(c1.y, c2.y * 0.85), c3.y * 0.7);
    return vec2(h + c1.x + c2.x + c3.x, cm);
#else

    vec2 c1 = craterLayer(q, 3.4, uCraterDensity * 0.55, uCraterDepth * 0.22, 1.0);
    return vec2(h + c1.x, c1.y);
#endif
  }

  vec3 shadeRocky(vec3 n0, vec3 V, vec3 L, mat3 Ry) {
    float e = 0.004;
    vec3 up = abs(n0.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 t1 = normalize(cross(up, n0));
    vec3 t2 = cross(n0, t1);
    float sea = uOcean > 0.01 ? 0.30 + 0.22 * uOcean : -1.0;

    vec3 p0 = Ry * n0;
    vec2 T0 = terrain(p0);
    float h0 = max(T0.x, sea);
    float hx = max(terrain(Ry * normalize(n0 + e * t1)).x, sea);
    float hy = max(terrain(Ry * normalize(n0 + e * t2)).x, sea);
    vec3 grad = ((hx - h0) * t1 + (hy - h0) * t2) / e;
    vec3 n = normalize(n0 - grad * 0.55);

    vec3 q = p0 + uSeedOff;
    float hh = T0.x;
    float tint = fbm(q * uNoiseScale * 1.2 + 21.0);
    vec3 albedo = mix(uColorDark, uColorBase, smoothstep(0.30, 0.62, tint));
    albedo = mix(albedo, uColorSecondary, smoothstep(0.38, 0.78, hh));
    albedo = mix(albedo, uColorAccent, smoothstep(0.66, 1.0, hh));
    albedo *= 1.0 - 0.22 * T0.y;
    albedo *= 1.0 - clamp(length(grad) * 0.07, 0.0, 0.2);
#if FINE_GRAIN
    albedo *= 0.88 + 0.24 * vnoise(q * 70.0);
#endif

    float water = 0.0;
    float ice = 0.0;
    if (sea > 0.0) {
      water = 1.0 - smoothstep(sea - 0.002, sea + 0.006, T0.x);
      float beach = (1.0 - smoothstep(sea, sea + 0.035, T0.x)) * (1.0 - water);
      albedo = mix(albedo, vec3(0.78, 0.72, 0.55), beach * 0.55);
      float depthW = clamp((sea - T0.x) / 0.16, 0.0, 1.0);
      vec3 wcol = mix(vec3(0.04, 0.30, 0.42), vec3(0.008, 0.045, 0.16), pow(depthW, 0.55));
      albedo = mix(albedo, wcol, water);
    }
    if (uIce > 0.0) {
      float capEdge = 1.0 - 0.5 * uIce;
      float lat = abs(p0.y) + (fbm(q * 3.0 + 40.0) - 0.5) * 0.16;
      ice = smoothstep(capEdge, capEdge + 0.06, lat);
      albedo = mix(albedo, vec3(0.9, 0.95, 1.0), ice);
    }

    float ndl = dot(n, L);
    float ndg = dot(n0, L);
    float soft = 0.03 + 0.25 * uAtmo;
    float day = smoothstep(-soft, soft + 0.12, ndg);
    float diff = max(ndl, 0.0) * day;
    vec3 sun = vec3(1.0, 0.97, 0.92) * 1.9;
    vec3 ambient = vec3(0.02, 0.025, 0.04) + uAtmoColor * 0.03 * uAtmo;
    vec3 col = albedo * (diff * sun + ambient);

    vec3 Hh = normalize(L + V);
    float spec = pow(max(dot(n0, Hh), 0.0), 140.0) * day;
    col += vec3(1.0, 0.95, 0.85) * spec * (water * 0.9 + ice * 0.15);
    float vf = pow(1.0 - max(dot(n0, V), 0.0), 4.0);
    col += water * vf * uAtmoColor * 0.35 * day;

    if (uCloud > 0.01 && uAtmo > 0.01) {
      vec3 cq = rotY(uSpin * 1.25 + 0.7) * n0 + uSeedOff * 0.5;
#if FINE_GRAIN
      float w = fbm(cq * 2.2);
      float cl = fbm(cq * 3.2 + w * 1.6 + 7.0);
#else
      float cl = fbm(cq * 3.0 + 7.0);
#endif
      float thr = mix(0.72, 0.46, uCloud);
      float cd = smoothstep(thr, thr + 0.16, cl) * 0.92;
      float cdiff = max(ndg, 0.0) * day * 1.9 + 0.02;
      col = mix(col, vec3(1.0) * cdiff, cd);
    }

    float fres = pow(1.0 - max(dot(n0, V), 0.0), 3.0);
    float lit = smoothstep(-0.25, 0.55, ndg);
    col += uAtmoColor * fres * lit * (0.25 + 1.1 * uAtmo);
    float tw = ndg / 0.22;
    col += mix(uAtmoColor, vec3(1.0, 0.5, 0.3), 0.6) * exp(-tw * tw) * uAtmo * 0.10 * (0.4 + fres * 2.0);
    return col;
  }

  vec3 lightGiant(vec3 col, vec3 n0, vec3 V, vec3 L, float rimAmount) {
    float ndg = dot(n0, L);
    float diff = clamp((ndg + 0.12) / 1.12, 0.0, 1.0);
    diff = diff * diff * (3.0 - 2.0 * diff);
    float limb = pow(max(dot(n0, V), 0.0), 0.35);
    col *= mix(0.55, 1.0, limb);
    vec3 sun = vec3(1.0, 0.97, 0.92) * 1.9;
    vec3 outc = col * (diff * sun + 0.015);
    float fres = pow(1.0 - max(dot(n0, V), 0.0), 3.0);
    outc += uAtmoColor * fres * smoothstep(-0.25, 0.55, ndg) * rimAmount;
    return outc;
  }

  vec3 shadeGas(vec3 n0, vec3 V, vec3 L, mat3 Ry) {
    vec3 p = Ry * n0;
    vec3 q = p + uSeedOff;
    float lat = p.y + (fbm(q * 2.5) - 0.5) * 0.10;

    float bands = fbm(vec3(q.x * 1.2, lat * 15.0, q.z * 1.2));
    float fine = fbm(vec3(q.x * 5.0, lat * 45.0, q.z * 5.0) + bands * 2.0);
    float v = clamp(bands * 0.75 + fine * 0.45 - 0.1, 0.0, 1.0);
    float zone = 0.5 + 0.5 * sin(lat * 11.0 + uSeedA * 6.28 + (bands - 0.5) * 2.0);
    v = mix(v, zone, 0.45);

    vec3 col = mix(uColorDark, uColorBase, smoothstep(0.2, 0.55, v));
    col = mix(col, uColorSecondary, smoothstep(0.5, 0.85, v));
    col = mix(col, uColorAccent, (1.0 - smoothstep(0.15, 0.45, v)) * 0.6);

    float a = uSeedB * 6.2831;
    vec3 cdir = normalize(vec3(cos(a), -0.26 - 0.1 * uSeedA, sin(a)));
    vec3 dv = p - cdir;
    float d = length(vec3(dv.x, dv.y * 2.4, dv.z));
    float spot = 1.0 - smoothstep(0.08, 0.26, d);
    float swirl = fbm(q * 9.0 + spot * 3.0);
    col = mix(col, mix(uColorAccent, uColorSecondary, swirl), spot * 0.85);

    return lightGiant(col, n0, V, L, 0.35 + 0.6 * uAtmo);
  }

  vec3 shadeIce(vec3 n0, vec3 V, vec3 L, mat3 Ry) {
    vec3 p = Ry * n0;
    vec3 q = p + uSeedOff;
    float lat = p.y + (fbm(q * 1.8) - 0.5) * 0.08;

    float bands = 0.5 + 0.5 * sin(lat * 9.0 + uSeedA * 6.28 + fbm(q * 2.0) * 2.0);
    float streak = fbm(vec3(q.x * 1.5, lat * 22.0, q.z * 1.5));
    float v = clamp(bands * 0.5 + streak * 0.7 - 0.1, 0.0, 1.0);
    vec3 col = mix(uColorDark, uColorBase, smoothstep(0.1, 0.6, v));
    col = mix(col, uColorSecondary, smoothstep(0.45, 0.95, v));

    float cl = smoothstep(0.62, 0.85, fbm(vec3(q.x * 3.0, lat * 30.0, q.z * 3.0) + 5.0));
    col = mix(col, uColorAccent, cl * 0.55);

    float a = uSeedB * 6.2831;
    vec3 cdir = normalize(vec3(cos(a), 0.3, sin(a)));
    vec3 dv = p - cdir;
    float d = length(vec3(dv.x, dv.y * 2.0, dv.z));
    col = mix(col, uColorDark * 0.7, (1.0 - smoothstep(0.06, 0.2, d)) * 0.6);

    return lightGiant(col, n0, V, L, 0.6 + 0.9 * uAtmo);
  }

  void main() {
    vec3 n0 = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 L = normalize(uLightDir);
    mat3 Ry = rotY(uSpin);

    vec3 col;
    if (uArchetype == 1) {
      col = shadeGas(n0, V, L, Ry);
    } else if (uArchetype == 2) {
      col = shadeIce(n0, V, L, Ry);
    } else {
      col = shadeRocky(n0, V, L, Ry);
    }

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const atmoVertex = `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const atmoFragment = `
  uniform vec3 uColor;
  uniform vec3 uLightDir;
  uniform float uIntensity;
  uniform float uInner;
  uniform float uOuter;
  varying vec3 vWorldPos;

  void main() {
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorldPos - ro);
    float tc = dot(-ro, rd);
    vec3 cp = ro + rd * tc;
    float D = length(cp);
    float k = clamp((uOuter - D) / (uOuter - uInner), 0.0, 1.0);
    float glow = pow(k, 2.6);
    float lit = smoothstep(-0.35, 0.6, dot(normalize(cp), normalize(uLightDir)));
    float a = glow * (0.15 + 0.85 * lit) * uIntensity;
    gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

const ringVertex = `
  varying vec3 vLocal;
  varying vec3 vWorldPos;
  void main() {
    vLocal = position;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const ringFragment = `
  uniform vec3 uColor;
  uniform vec3 uLightDir;
  uniform float uSeed;
  uniform float uInner;
  uniform float uOuter;
  uniform float uPlanetR;
  varying vec3 vLocal;
  varying vec3 vWorldPos;

  float h11(float x) { return fract(sin(x * 127.1 + uSeed * 311.7) * 43758.5453); }
  float n1(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(h11(i), h11(i + 1.0), f);
  }

  void main() {
    float r = length(vLocal.xy);
    float t = (r - uInner) / (uOuter - uInner);
    float band = n1(t * 38.0) * 0.45 + n1(t * 97.0) * 0.35 + n1(t * 230.0) * 0.2;
    float edge = smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.93, 1.0, t));
    float gap = smoothstep(0.0, 0.03, abs(t - 0.64));
    float dens = edge * mix(0.35, 1.0, gap) * (0.25 + 0.9 * band);

    vec3 L = normalize(uLightDir);
    float along = dot(vWorldPos, L);
    float dist = length(vWorldPos - L * along);
    float sh = along < 0.0 ? smoothstep(uPlanetR * 0.97, uPlanetR * 1.05, dist) : 1.0;

    vec3 col = uColor * (0.55 + 0.7 * band) * (0.1 + 1.5 * sh);
    gl_FragColor = vec4(col, clamp(dens, 0.0, 0.95));
    #include <colorspace_fragment>
  }
`;

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function archetypeIndex(visual: Visual) {
  const a = visual.archetype as string;
  return a === 'gas_giant' ? 1 : a === 'ice_giant' ? 2 : 0;
}

function ringInfo(visual: Visual) {
  const kind = archetypeIndex(visual);
  const rnd = mulberry32(hashString(String(visual.seed)) ^ 0x9e3779b9);
  const r = rnd();
  const has = kind === 1 ? r > 0.5 : kind === 2 ? r > 0.75 : false;
  return { has, tilt: 0.25 + rnd() * 0.35, roll: (rnd() - 0.5) * 0.5, seed: rnd() * 10 };
}

function Planet({ visual }: { visual: Visual }) {
  const spin = useRef(0);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const lightDir = useMemo(() => new THREE.Vector3(-0.8, 0.35, 0.5).normalize(), []);

  const { planetMat, atmoMat, ringMat, ring } = useMemo(() => {
    const kind = archetypeIndex(visual);
    const rnd = mulberry32(hashString(String(visual.seed)));
    const off = new THREE.Vector3(rnd() * 40, rnd() * 40, rnd() * 40);
    const seedA = rnd();
    const seedB = rnd();

    const s = visual.surface;
    const a = visual.atmosphere;
    const atmo = a.enabled ? clamp01(a.opacity) : 0;
    const ocean = kind === 0 ? clamp01(s.ocean_coverage ?? 0) : 0;
    const ice = ocean > 0 ? 0.3 + 0.5 * seedA : 0;

    const planetMat = new THREE.ShaderMaterial({
      vertexShader: planetVertex,
      fragmentShader: planetFragment,
      uniforms: {
        uSpin: { value: 0 },
        uTime: { value: 0 },
        uSeedOff: { value: off },
        uSeedA: { value: seedA },
        uSeedB: { value: seedB },
        uLightDir: { value: lightDir },
        uColorBase: { value: new THREE.Color(visual.palette.base) },
        uColorSecondary: { value: new THREE.Color(visual.palette.secondary) },
        uColorAccent: { value: new THREE.Color(visual.palette.accent) },
        uColorDark: { value: new THREE.Color(visual.palette.dark) },
        uArchetype: { value: kind },
        uNoiseScale: { value: s.noise_scale },
        uMountain: { value: s.mountain_strength },
        uCraterDensity: { value: s.crater_density },
        uCraterDepth: { value: s.crater_depth },
        uOcean: { value: ocean },
        uIce: { value: ice },
        uCloud: { value: a.enabled ? clamp01(a.clouds) : 0 },
        uAtmo: { value: atmo },
        uAtmoColor: { value: new THREE.Color(a.color) },
      },
    });

    const atmoMat =
      atmo > 0.02
        ? new THREE.ShaderMaterial({
            vertexShader: atmoVertex,
            fragmentShader: atmoFragment,
            transparent: true,
            depthWrite: false,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            uniforms: {
              uColor: { value: new THREE.Color(a.color) },
              uLightDir: { value: lightDir },
              uIntensity: { value: 0.45 + atmo * 1.3 + (a.glow ?? 0) * 0.6 },
              uInner: { value: PLANET_R },
              uOuter: { value: ATMO_R },
            },
          })
        : null;

    const ring = ringInfo(visual);
    const ringColor = new THREE.Color(visual.palette.secondary).lerp(new THREE.Color('#ffffff'), 0.25);
    const ringMat = ring.has
      ? new THREE.ShaderMaterial({
          vertexShader: ringVertex,
          fragmentShader: ringFragment,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          uniforms: {
            uColor: { value: ringColor },
            uLightDir: { value: lightDir },
            uSeed: { value: ring.seed },
            uInner: { value: RING_INNER },
            uOuter: { value: RING_OUTER },
            uPlanetR: { value: PLANET_R },
          },
        })
      : null;

    return { planetMat, atmoMat, ringMat, ring };
  }, [visual, lightDir]);

  useEffect(
    () => () => {
      planetMat.dispose();
      atmoMat?.dispose();
      ringMat?.dispose();
    },
    [planetMat, atmoMat, ringMat],
  );

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    spin.current += delta * 0.06;
    planetMat.uniforms.uSpin.value = spin.current;
    tmp.set(-0.8, 0.35, 0.5).applyQuaternion(state.camera.quaternion);
    lightDir.copy(tmp).normalize();
  });

  return (
    <group>
      <mesh material={planetMat}>
        <sphereGeometry args={[PLANET_R, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
      </mesh>
      {atmoMat && (
        <mesh material={atmoMat}>
          <sphereGeometry args={[ATMO_R, ATMO_SEGMENTS, ATMO_SEGMENTS]} />
        </mesh>
      )}
      {ringMat && (
        <mesh material={ringMat} rotation={[Math.PI / 2 + ring.tilt, 0, ring.roll]}>
          <ringGeometry args={[RING_INNER, RING_OUTER, RING_SEGMENTS, 1]} />
        </mesh>
      )}
    </group>
  );
}

function TouchScroll() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const apply = () => {
      gl.domElement.style.touchAction = 'pan-y';
    };
    apply();
    const id = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(id);
  }, [gl]);
  return null;
}

function FrameDriver({ active, fps }: { active: boolean; fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!active) return;
    const interval = 1000 / fps;
    let id = 0;
    let last = 0;
    const loop = (t: number) => {
      id = requestAnimationFrame(loop);
      if (t - last >= interval - 2) {
        last = t;
        invalidate();
      }
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [active, fps, invalidate]);
  return null;
}

function useIsActive(ref: RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return inView && tabVisible;
}

export default function Planet3D({ visual, mini = false }: { visual: Visual, mini?: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = useIsActive(wrapRef);

  if (!visual) return <div className="text-white">Нет данных для 3D</div>;

  const hasRings = ringInfo(visual).has;
  const distance = mini ? (hasRings ? 17 : 9) : (hasRings ? 11.5 : 6.4);

  return (
    <div
      ref={wrapRef}
      className={`${
        mini
          ? 'w-full h-full relative'
          : 'w-full h-72 sm:h-96 rounded-xl overflow-hidden border border-slate-800 relative mt-6'
      }`}
      style={{ background: 'radial-gradient(ellipse at 50% 35%, #0c1428 0%, #03050d 75%)' }}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, MAX_DPR]}
        camera={{ position: [0, 0.8, distance], fov: mini ? 50 : 40 }}
        gl={{ antialias: !IS_LOW, powerPreference: 'high-performance' }}
      >
        {!mini && <Stars radius={60} depth={40} count={STARS_COUNT} factor={4} saturation={0} fade speed={IS_LOW ? 0 : 0.4} />}
        <Planet visual={visual} />
        <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={0.6} />
        <TouchScroll />
        <FrameDriver active={active} fps={TARGET_FPS} />
      </Canvas>
      {!mini && (
        <div className="absolute bottom-2 left-3 text-[10px] text-slate-500 pointer-events-none">
          Процедурная визуализация, потяните, чтобы повернуть
        </div>
      )}
    </div>
  );
}
