import type { CheckIn, DailyHealth } from './types';

export interface ReadinessComponent {
  key: 'hrv' | 'rhr' | 'sleep' | 'load' | 'feel';
  label: string;
  score: number; // 0–100
  detail: string;
  weight: number;
}

export interface Readiness {
  score: number | null;
  level: 'green' | 'yellow' | 'red' | 'unknown';
  headline: string;
  advice: string;
  components: ReadinessComponent[];
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Piecewise-linear interpolation over [x, y] points sorted by x. */
function interp(x: number, pts: [number, number][]): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
}

export interface ReadinessInput {
  today: DailyHealth;
  /** Previous days (any order), used as the personal baseline. Ideally 28–60 days. */
  history: DailyHealth[];
  /** Training form (fitness − fatigue) from the load model. */
  tsb?: number;
  checkIn?: CheckIn;
  sleepGoalHours?: number;
}

/**
 * Daily readiness from HRV and resting HR versus your own baseline, sleep, training
 * load and how you feel. Components that have no data are skipped and the weights
 * re-normalised. Guidance only. Listen to your body.
 */
export function computeReadiness(input: ReadinessInput): Readiness {
  const { today, history, tsb, checkIn } = input;
  const sleepGoal = input.sleepGoalHours ?? 8;
  const comps: ReadinessComponent[] = [];

  const hrvHist = history.map((h) => h.hrvMs).filter((v): v is number => typeof v === 'number');
  if (today.hrvMs && hrvHist.length >= 5) {
    const base = mean(hrvHist);
    const ratio = today.hrvMs / base;
    const score = clamp(interp(ratio, [[0.75, 15], [0.85, 45], [0.95, 75], [1.0, 90], [1.05, 100]]));
    comps.push({
      key: 'hrv',
      label: 'HRV',
      score,
      weight: 25,
      detail: `${Math.round(today.hrvMs)} ms vs ${Math.round(base)} ms baseline (${ratio >= 1 ? '+' : ''}${Math.round((ratio - 1) * 100)}%)`,
    });
  }

  const rhrHist = history.map((h) => h.restingHr).filter((v): v is number => typeof v === 'number');
  if (today.restingHr && rhrHist.length >= 5) {
    const base = mean(rhrHist);
    const diff = today.restingHr - base;
    const score = clamp(interp(diff, [[-2, 100], [0, 92], [3, 72], [5, 50], [8, 20], [10, 10]]));
    comps.push({
      key: 'rhr',
      label: 'Resting HR',
      score,
      weight: 15,
      detail: `${Math.round(today.restingHr)} bpm vs ${Math.round(base)} baseline (${diff >= 0 ? '+' : ''}${Math.round(diff)})`,
    });
  }

  if (typeof today.sleepHours === 'number' && today.sleepHours > 0) {
    const s = today.sleepHours;
    const score = clamp(interp(s / sleepGoal, [[0.55, 10], [0.65, 30], [0.75, 55], [0.875, 80], [1.0, 100]]));
    const h = Math.floor(s);
    const m = Math.round((s - h) * 60);
    comps.push({ key: 'sleep', label: 'Sleep', score, weight: 25, detail: `${h} h ${m} min (goal ${sleepGoal} h)` });
  }

  if (typeof tsb === 'number') {
    const score = clamp(interp(tsb, [[-40, 15], [-30, 35], [-20, 60], [-10, 80], [0, 95], [10, 100]]));
    comps.push({
      key: 'load',
      label: 'Training load',
      score,
      weight: 15,
      detail: tsb < -25 ? 'Heavy recent load' : tsb < -10 ? 'Productive fatigue' : 'Fresh',
    });
  }

  if (checkIn) {
    const energy = (checkIn.energy - 1) / 4;
    const motivation = (checkIn.motivation - 1) / 4;
    const soreness = 1 - (checkIn.soreness - 1) / 4;
    const stress = 1 - (checkIn.stress - 1) / 4;
    const score = clamp(Math.round(((energy * 1.2 + motivation * 0.8 + soreness + stress) / 4) * 100));
    comps.push({
      key: 'feel',
      label: 'How you feel',
      score,
      weight: 20,
      detail: `Energy ${checkIn.energy}/5 · Soreness ${checkIn.soreness}/5 · Stress ${checkIn.stress}/5`,
    });
  }

  if (comps.length === 0) {
    return {
      score: null,
      level: 'unknown',
      headline: 'Not enough data yet',
      advice:
        'Connect Apple Health (Apple Watch or Garmin) and do the 20-second morning check-in. Readiness gets accurate after about a week of data.',
      components: [],
    };
  }

  const totalW = comps.reduce((s, c) => s + c.weight, 0);
  const score = Math.round(comps.reduce((s, c) => s + c.score * c.weight, 0) / totalW);
  // Any single red flag caps the day at yellow.
  const redFlag = comps.some((c) => c.score < 30);
  let level: Readiness['level'] = score >= 75 ? 'green' : score >= 55 ? 'yellow' : 'red';
  if (level === 'green' && redFlag) level = 'yellow';

  const advice = {
    green: {
      headline: 'Ready to train',
      advice: 'Go ahead with today’s plan as written.',
    },
    yellow: {
      headline: 'Train, but keep it controlled',
      advice:
        'Do the session but cap intensity at Zone 2–3 and cut hard intervals by about a third. Easy sessions stay as planned.',
    },
    red: {
      headline: 'Recovery day recommended',
      advice:
        'Swap today for 20–30 min very easy (swim or spin) or take the day off. One missed day costs nothing; digging a hole costs weeks.',
    },
    unknown: { headline: '', advice: '' },
  }[level];

  return { score, level, components: comps, ...advice };
}

/** Sleep hours for a night from category samples (asleep stages only). */
export function sumSleepHours(
  samples: { value: number; startDate: Date; endDate: Date }[],
  asleepValues: number[],
): number {
  // Merge overlapping intervals (multiple sources like Watch + Garmin can overlap).
  const ivs = samples
    .filter((s) => asleepValues.includes(s.value))
    .map((s) => [s.startDate.getTime(), s.endDate.getTime()] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let cur: [number, number] | null = null;
  for (const iv of ivs) {
    if (!cur || iv[0] > cur[1]) {
      if (cur) total += cur[1] - cur[0];
      cur = [iv[0], iv[1]];
    } else {
      cur[1] = Math.max(cur[1], iv[1]);
    }
  }
  if (cur) total += cur[1] - cur[0];
  return Math.round((total / 3_600_000) * 100) / 100;
}
