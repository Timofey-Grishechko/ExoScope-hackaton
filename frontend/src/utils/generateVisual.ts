import type { Planet, Visual } from '../types/planet';

type Palette = { base: string; secondary: string; accent: string; dark: string };


const stringToHash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};


const mulberry32 = (a: number) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Палитры каменистых планет по температурному классу
const ROCKY: Record<'hot' | 'warm' | 'temperate' | 'cold' | 'neutral', Palette[]> = {

  hot: [
    { base: '#4A3B36', secondary: '#7A4A32', accent: '#C8683A', dark: '#1C1514' },
    { base: '#3F3A3A', secondary: '#6E4636', accent: '#B85A33', dark: '#171212' },
  ],

  warm: [
    { base: '#9B5B3A', secondary: '#C07A4E', accent: '#E0A878', dark: '#4B2A1C' },
    { base: '#8E6A45', secondary: '#B88F5F', accent: '#DDBB8A', dark: '#4A3623' },
  ],

  temperate: [
    { base: '#6B7A4B', secondary: '#8C8A5A', accent: '#C9C3A1', dark: '#3A4A33' },
    { base: '#7A8350', secondary: '#9A8F5E', accent: '#D2C6A0', dark: '#3F4B30' },
    { base: '#9A7B52', secondary: '#B9976A', accent: '#DCC7A0', dark: '#5A4631' },
  ],
  // < 230 K: ледяные миры
  cold: [
    { base: '#9FB4C4', secondary: '#C9D8E2', accent: '#F1F7FB', dark: '#54697A' },
    { base: '#A9B6C0', secondary: '#D3DCE3', accent: '#F4F8FA', dark: '#5C6872' },
  ],
  // температура неизвестна: лунно-серые
  neutral: [
    { base: '#81766C', secondary: '#A68D75', accent: '#C1A58A', dark: '#403B38' },
    { base: '#827C73', secondary: '#B2A08B', accent: '#D0BCA2', dark: '#46423E' },
    { base: '#77594C', secondary: '#A77B60', accent: '#C79B75', dark: '#382C29' },
  ],
};

const GAS: Palette[] = [
  { base: '#C18E6A', secondary: '#D6B28B', accent: '#8E5D4B', dark: '#563B36' },
  { base: '#B18D72', secondary: '#D4C0A2', accent: '#80685C', dark: '#4D403B' },
  { base: '#C9A56E', secondary: '#E3CC9A', accent: '#9A6B3E', dark: '#5E4528' },
];

const ICE: Palette[] = [
  { base: '#4E8DAF', secondary: '#79B7C9', accent: '#B0D6D9', dark: '#254B6A' },
  { base: '#638DAE', secondary: '#A0C5D4', accent: '#C5DFE4', dark: '#304D70' },
  { base: '#4FA3A5', secondary: '#86C9C4', accent: '#C2E8E2', dark: '#27585C' },
];

export function generateVisual(planet: Planet): Visual {
  const seedNum = stringToHash(planet.id);
  const seed = seedNum.toString(16);
  const rnd = mulberry32(seedNum);
  const range = (a: number, b: number) => a + rnd() * (b - a);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length) % arr.length];


  let archetype: Visual['archetype'] = 'rocky';
  if (planet.radius_earth && planet.radius_earth > 4.0) {
    archetype = 'gas_giant';
  } else if (planet.radius_earth && planet.radius_earth > 2.5) {
    archetype = 'ice_giant';
  }

  const temp = planet.eq_temp_k ?? null;
  const tempClass: keyof typeof ROCKY =
    temp === null ? 'neutral' : temp > 450 ? 'hot' : temp > 330 ? 'warm' : temp >= 230 ? 'temperate' : 'cold';

  let palette: Palette;
  if (archetype === 'gas_giant') palette = pick(GAS);
  else if (archetype === 'ice_giant') palette = pick(ICE);
  else palette = pick(ROCKY[tempClass]);

  const rocky = archetype === 'rocky';


  const hasOcean = rocky && tempClass === 'temperate' && (planet.esi ?? 0) >= 0.5;


  let atmoOpacity: number;
  let atmoColor: string;
  let clouds: number;
  if (archetype === 'gas_giant') {
    atmoOpacity = range(0.6, 0.9);
    atmoColor = '#E8C6A5';
    clouds = range(0.6, 0.95);
  } else if (archetype === 'ice_giant') {
    atmoOpacity = range(0.4, 0.7);
    atmoColor = '#8FC9E0';
    clouds = range(0.4, 0.8);
  } else if (tempClass === 'temperate') {
    atmoOpacity = range(0.3, 0.5);
    atmoColor = '#8FB8E8';
    clouds = range(0.35, 0.6);
  } else if (tempClass === 'cold') {
    atmoOpacity = range(0.15, 0.3);
    atmoColor = '#BFD8EA';
    clouds = range(0.1, 0.25);
  } else if (tempClass === 'warm') {
    atmoOpacity = range(0.1, 0.25);
    atmoColor = '#D9A074';
    clouds = range(0.05, 0.2);
  } else if (tempClass === 'hot') {
    atmoOpacity = range(0.0, 0.12);
    atmoColor = '#E8A070';
    clouds = 0;
  } else {
    atmoOpacity = range(0.0, 0.15);
    atmoColor = '#A6B9C8';
    clouds = range(0, 0.1);
  }

  return {
    version: 2,
    seed,
    archetype,
    palette,
    surface: {
      noise_scale: range(2.2, 4.2),
      noise_octaves: 5,
      noise_persistence: 0.5,
      mountain_strength: rocky ? range(0.3, 0.75) : 0,
      ridge_sharpness: 0.7,
      crater_density: rocky ? (hasOcean ? range(0.15, 0.35) : range(0.4, 0.8)) : 0,
      crater_size: 0.05,
      crater_depth: rocky ? range(0.25, 0.45) : 0,
      ocean_coverage: hasOcean ? range(0.35, 0.75) : 0,
      roughness: 0.8,
    },
    atmosphere: {
      enabled: atmoOpacity > 0.02,
      color: atmoColor,
      opacity: atmoOpacity,
      glow: range(0.2, 0.5),
      clouds,
    },
  } as Visual;
}
