import type { Markers, Zone } from './types';

export interface HrZone {
  zone: Zone;
  name: string;
  low: number;
  high: number;
  feel: string;
}

/** Tanaka formula: more accurate than 220 − age for trained people. */
export function estimateMaxHr(age: number): number {
  return Math.round(208 - 0.7 * age);
}

export function effectiveMaxHr(age: number, m: Markers): number {
  return m.maxHr ?? estimateMaxHr(age);
}

export function effectiveRestingHr(m: Markers): number {
  return m.restingHr ?? 60;
}

/** Rough LTHR estimate when no field test has been done (~89% of max). */
export function effectiveLthr(age: number, m: Markers): number {
  return m.lthr ?? Math.round(effectiveMaxHr(age, m) * 0.89);
}

const ZONE_META: { name: string; feel: string }[] = [
  { name: 'Recovery', feel: 'Very easy. Could chat all day.' },
  { name: 'Endurance', feel: 'Easy, nose-breathing pace. Where Ironman fitness is built.' },
  { name: 'Tempo', feel: 'Comfortably hard. Short sentences only.' },
  { name: 'Threshold', feel: 'Hard. A few words at a time. ~1 hour race effort.' },
  { name: 'VO2 / Max', feel: 'Very hard. Short intervals only.' },
];

/**
 * Heart-rate zones. Uses Friel-style % of LTHR when a threshold test exists, otherwise
 * Karvonen heart-rate-reserve zones from max and resting HR.
 */
export function heartRateZones(age: number, m: Markers): HrZone[] {
  if (m.lthr) {
    const l = m.lthr;
    const bounds: [number, number][] = [
      [0.65, 0.85],
      [0.85, 0.9],
      [0.9, 0.95],
      [0.95, 1.0],
      [1.0, 1.06],
    ];
    return bounds.map(([lo, hi], i) => ({
      zone: (i + 1) as Zone,
      name: ZONE_META[i].name,
      feel: ZONE_META[i].feel,
      low: Math.round(l * lo),
      high: Math.round(l * hi) - (i < 4 ? 1 : 0),
    }));
  }
  const max = effectiveMaxHr(age, m);
  const rest = effectiveRestingHr(m);
  const hrr = max - rest;
  const bounds: [number, number][] = [
    [0.5, 0.6],
    [0.6, 0.7],
    [0.7, 0.8],
    [0.8, 0.9],
    [0.9, 1.0],
  ];
  return bounds.map(([lo, hi], i) => ({
    zone: (i + 1) as Zone,
    name: ZONE_META[i].name,
    feel: ZONE_META[i].feel,
    low: Math.round(rest + hrr * lo),
    high: Math.round(rest + hrr * hi) - (i < 4 ? 1 : 0),
  }));
}

/** Which zone an average heart rate falls into. */
export function zoneForHr(hr: number, zones: HrZone[]): Zone {
  for (let i = zones.length - 1; i >= 0; i--) {
    if (hr >= zones[i].low) return zones[i].zone;
  }
  return 1;
}

/** Critical swim speed from a 400 m and 200 m time trial (seconds). Returns sec per 100 m. */
export function cssFromTest(t400Sec: number, t200Sec: number): number {
  if (t400Sec <= t200Sec) throw new Error('400 m time must be slower than 200 m time');
  const metresPerSec = 200 / (t400Sec - t200Sec);
  return Math.round(100 / metresPerSec);
}

/** Swim paces derived from CSS (seconds per 100 m). */
export function swimPaces(cssSecPer100: number) {
  return {
    easy: cssSecPer100 + 15,
    endurance: cssSecPer100 + 8,
    css: cssSecPer100,
    fast: cssSecPer100 - 5,
  };
}

/** LTHR from a 30-minute solo run test: average HR of the final 20 minutes. */
export function lthrFromRunTest(avgHrLast20: number): number {
  return Math.round(avgHrLast20);
}

/** Bike power zones (Coggan) when an FTP exists. */
export function powerZones(ftp: number) {
  const z = [
    [0, 0.55],
    [0.56, 0.75],
    [0.76, 0.9],
    [0.91, 1.05],
    [1.06, 1.2],
  ];
  return z.map(([lo, hi], i) => ({
    zone: (i + 1) as Zone,
    low: Math.round(ftp * lo),
    high: Math.round(ftp * hi),
  }));
}
