import { addDays, daysBetween, mondayOnOrBefore, weekdayOf } from './dates';
import { buildWorkout } from './workouts';
import type {
  Markers,
  Phase,
  PlannedSession,
  PlanSettings,
  PlanWeek,
  Profile,
  SessionKind,
  Sport,
  Weekday,
} from './types';

// ───────────────────────── Phase layout ─────────────────────────

export interface PhaseBlock {
  phase: Phase;
  /** 1-based inclusive week numbers */
  start: number;
  end: number;
}

export const PHASE_INFO: Record<Phase, { name: string; focus: string; color: string }> = {
  foundation: {
    name: 'Foundation',
    focus: 'Learn efficient swimming, build the habit, easy aerobic volume.',
    color: '#4FC3F7',
  },
  base: {
    name: 'Base',
    focus: 'Build the aerobic engine: longer rides & runs, first bricks, swim endurance.',
    color: '#81C784',
  },
  build: {
    name: 'Build',
    focus: 'Race-specific strength: threshold work, open water, 70.3 preparation.',
    color: '#FFB74D',
  },
  peak: {
    name: 'Ironman-specific',
    focus: 'Long rides, long runs, race-nutrition rehearsals. The big weeks.',
    color: '#E57373',
  },
  taper: {
    name: 'Taper',
    focus: 'Absorb the training: less volume, a little intensity, lots of sleep.',
    color: '#BA68C8',
  },
  race: {
    name: 'Race week',
    focus: 'Rest, prep your gear, trust the work.',
    color: '#FFD54F',
  },
};

export function totalWeeks(settings: Pick<PlanSettings, 'startDate' | 'raceDate'>): number {
  const raceMonday = mondayOnOrBefore(settings.raceDate);
  return Math.floor(daysBetween(settings.startDate, raceMonday) / 7) + 1;
}

export function phaseLayout(n: number): PhaseBlock[] {
  if (n < 6) {
    return [
      ...(n > 1 ? [{ phase: 'taper' as Phase, start: 1, end: n - 1 }] : []),
      { phase: 'race', start: n, end: n },
    ];
  }
  const taper = n >= 14 ? 2 : 1;
  const m = n - 1 - taper;
  const f = Math.round(m * 0.25);
  const b = Math.round(m * 0.25);
  const bu = Math.round(m * 0.25);
  const p = m - f - b - bu;
  const blocks: PhaseBlock[] = [];
  let w = 1;
  for (const [phase, len] of [
    ['foundation', f],
    ['base', b],
    ['build', bu],
    ['peak', p],
    ['taper', taper],
    ['race', 1],
  ] as [Phase, number][]) {
    if (len <= 0) continue;
    blocks.push({ phase, start: w, end: w + len - 1 });
    w += len;
  }
  return blocks;
}

// ───────────────────────── Session specs ─────────────────────────

type Range = [number, number];

const DURATIONS: Record<string, Partial<Record<Phase, Range>>> = {
  longRide: { foundation: [60, 100], base: [110, 160], build: [170, 225], peak: [240, 315] },
  longRun: { foundation: [40, 60], base: [60, 85], build: [85, 105], peak: [105, 150] },
  swim: { foundation: [30, 40], base: [40, 50], build: [45, 55], peak: [50, 60] },
  bikeQ: { foundation: [45, 50], base: [55, 65], build: [60, 75], peak: [70, 90] },
  runQ: { foundation: [30, 40], base: [40, 50], build: [45, 60], peak: [50, 65] },
  runEasy: { foundation: [30, 35], base: [35, 45], build: [40, 50], peak: [40, 50] },
  brick: { base: [10, 20], build: [20, 30], peak: [30, 50] },
  bikeEasy: { base: [45, 60], build: [45, 60], peak: [45, 60] },
  strength: { foundation: [40, 40], base: [40, 40], build: [35, 35], peak: [30, 30], taper: [25, 25] },
};

const MIN_MINUTES: Record<Sport, number> = {
  swim: 20,
  bike: 30,
  run: 20,
  strength: 20,
  soccer: 30,
  race: 0,
  mobility: 10,
};

interface Spec {
  slot: string;
  kind: SessionKind;
  sport: Sport;
  minutes: number;
  /** Preferred weekdays in order; scheduler falls back to anything valid. */
  prefer: Weekday[];
  key: boolean;
  hard: boolean;
  /** Must be placed on this exact day (races, soccer, race-week sessions). */
  fixedDay?: Weekday;
  /** Must share a day with another slot (brick run after long ride). */
  sameDayAs?: string;
  /** Nice-to-have: dropping it for lack of time doesn't trigger a warning. */
  optional?: boolean;
  raceLabel?: string;
}

function lerp(r: Range | undefined, t: number): number {
  if (!r) return 0;
  return Math.round((r[0] + (r[1] - r[0]) * t) / 5) * 5;
}

const KIND_SPORT: Record<SessionKind, Sport> = {
  'swim-technique': 'swim',
  'swim-endurance': 'swim',
  'swim-css': 'swim',
  'swim-openwater': 'swim',
  'swim-test': 'swim',
  'bike-long': 'bike',
  'bike-quality': 'bike',
  'bike-easy': 'bike',
  'bike-test': 'bike',
  'run-long': 'run',
  'run-quality': 'run',
  'run-easy': 'run',
  'run-brick': 'run',
  'run-test': 'run',
  strength: 'strength',
  soccer: 'soccer',
  race: 'race',
  mobility: 'mobility',
};

const HARD_KINDS: SessionKind[] = ['bike-quality', 'run-quality', 'soccer', 'swim-test', 'bike-test', 'run-test', 'race'];

interface WeekContext {
  week: number;
  phase: Phase;
  localWeek: number;
  phaseLength: number;
  isRecovery: boolean;
  isBusy: boolean;
  raceLabel?: string;
  testWeek: 'baseline-1' | 'baseline-2' | 'full' | 'swim' | null;
  preRace: boolean;
  longRideDay: Weekday;
  longRunDay: Weekday;
}

function weekdayPrefs(ctx: WeekContext) {
  const LR = ctx.longRideDay;
  const LN = ctx.longRunDay;
  const weekdays = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).filter((d) => d !== LR && d !== LN);
  const order = (...days: number[]) =>
    days.map((d) => d as Weekday).filter((d) => weekdays.includes(d));
  return {
    longRide: [LR, LN] as Weekday[],
    longRun: [LN] as Weekday[],
    swim1: order(1, 2, 0, 3, 4),
    swim2: order(3, 2, 4, 0, 1),
    swim3: [...order(4, 0), LN, ...order(2)] as Weekday[],
    bikeQ: order(2, 1, 3),
    runQ: order(1, 3, 2),
    runEasy: order(3, 4, 2, 0),
    strength1: order(1, 2, 3),
    strength2: order(3, 2, 4),
    bikeEasy: order(4, 0, 3),
  };
}

function specsForWeek(ctx: WeekContext, settings: PlanSettings, n: number, peakEnd: number): Spec[] {
  const P = weekdayPrefs(ctx);
  const specs: Spec[] = [];
  const add = (s: Omit<Spec, 'sport' | 'hard'> & { hard?: boolean }) =>
    specs.push({ ...s, sport: KIND_SPORT[s.kind], hard: s.hard ?? HARD_KINDS.includes(s.kind) });

  // Soccer is user-scheduled and always first.
  const soccerDays = settings.soccerDays ?? [];
  if (ctx.phase !== 'race' && ctx.phase !== 'taper') {
    soccerDays.forEach((d, i) =>
      add({ slot: `soccer${i + 1}`, kind: 'soccer', minutes: settings.soccerMinutes, prefer: [d], fixedDay: d, key: false }),
    );
  }
  const soccerHeavy = soccerDays.length >= 2 && ctx.phase !== 'race' && ctx.phase !== 'taper';

  // ── Race week: fixed choreography relative to race day ──
  if (ctx.phase === 'race') {
    const raceDay = weekdayOf(settings.raceDate);
    const at = (offset: number) => Math.max(0, raceDay + offset) as Weekday;
    add({ slot: 'rw-swim', kind: 'swim-endurance', minutes: 30, prefer: [at(-5)], fixedDay: at(-5), key: false });
    add({ slot: 'rw-bike', kind: 'bike-quality', minutes: 45, prefer: [at(-4)], fixedDay: at(-4), key: false });
    add({ slot: 'rw-run', kind: 'run-quality', minutes: 30, prefer: [at(-3)], fixedDay: at(-3), key: false });
    add({ slot: 'rw-ow', kind: 'swim-openwater', minutes: 20, prefer: [at(-2)], fixedDay: at(-2), key: false });
    add({ slot: 'rw-spin', kind: 'bike-easy', minutes: 20, prefer: [at(-1)], fixedDay: at(-1), key: false });
    add({ slot: 'race', kind: 'race', minutes: RACE_MINUTES.full, prefer: [raceDay], fixedDay: raceDay, key: true, raceLabel: settings.raceName || 'IRONMAN' });
    return specs;
  }

  // Scale factors
  let scale = 1;
  if (ctx.isRecovery) scale = 0.65;
  if (ctx.preRace) scale = Math.min(scale, 0.85);
  if (ctx.isBusy) scale = Math.min(scale, 0.6);

  // Progress inside the phase (0..1) and, for taper, base off the end of peak.
  const t = ctx.phaseLength > 1 ? (ctx.localWeek - 1) / (ctx.phaseLength - 1) : 1;
  let durPhase: Phase = ctx.phase;
  let tt = t;
  if (ctx.phase === 'taper') {
    durPhase = 'peak';
    tt = 1;
    const weeksToRace = n - ctx.week; // 2 → first taper week, 1 → second
    scale = weeksToRace >= 2 ? 0.7 : 0.5;
  }
  const d = (key: string) => Math.max(0, Math.round((lerp(DURATIONS[key][durPhase], tt) * scale) / 5) * 5);

  // ── B-race weeks (tune-up / 70.3) ──
  if (ctx.raceLabel) {
    const raceDay: Weekday = 6;
    add({
      slot: 'race',
      kind: 'race',
      minutes: ctx.raceLabel.includes('70.3') ? RACE_MINUTES.half : RACE_MINUTES.tuneUp,
      prefer: [raceDay],
      fixedDay: raceDay,
      key: true,
      raceLabel: ctx.raceLabel,
    });
    add({ slot: 'swim1', kind: 'swim-endurance', minutes: d('swim'), prefer: P.swim1, key: true });
    add({ slot: 'swim2', kind: 'swim-openwater', minutes: Math.min(30, d('swim')), prefer: P.swim2, key: false });
    add({ slot: 'bikeQ', kind: 'bike-quality', minutes: 45, prefer: P.bikeQ, key: false, hard: false });
    add({ slot: 'runQ', kind: 'run-quality', minutes: 30, prefer: P.runQ, key: false, hard: false });
    add({ slot: 'shakeout', kind: 'bike-easy', minutes: 20, prefer: [5], key: false, optional: true });
    return specs;
  }

  // ── Normal training week ──
  const swimKinds: SessionKind[] =
    ctx.phase === 'foundation'
      ? ['swim-technique', 'swim-technique', 'swim-endurance']
      : ctx.phase === 'base'
        ? ['swim-technique', 'swim-css', 'swim-endurance']
        : ctx.phase === 'taper'
          ? ['swim-css', 'swim-endurance', 'swim-openwater']
          : ['swim-css', 'swim-endurance', 'swim-openwater'];

  const recoveryLike = ctx.isRecovery || ctx.isBusy;

  add({ slot: 'longRide', kind: 'bike-long', minutes: d('longRide'), prefer: P.longRide, key: true });
  add({ slot: 'longRun', kind: 'run-long', minutes: d('longRun'), prefer: P.longRun, key: true });
  add({ slot: 'swim1', kind: swimKinds[0], minutes: d('swim'), prefer: P.swim1, key: true });
  add({ slot: 'swim2', kind: swimKinds[1], minutes: d('swim'), prefer: P.swim2, key: true });
  add({ slot: 'bikeQ', kind: 'bike-quality', minutes: d('bikeQ'), prefer: P.bikeQ, key: !recoveryLike, hard: !recoveryLike && ctx.phase !== 'taper' });
  if (d('brick') > 0 && !recoveryLike) {
    add({ slot: 'brick', kind: 'run-brick', minutes: d('brick'), prefer: P.longRide, sameDayAs: 'longRide', key: false, optional: ctx.phase === 'peak' });
  }
  if (!ctx.isBusy) {
    add({ slot: 'swim3', kind: swimKinds[2], minutes: Math.max(25, d('swim') - 5), prefer: P.swim3, key: false });
  }
  // Soccer already covers high-intensity running: swap run quality for an easy run.
  const runQKind: SessionKind = soccerHeavy ? 'run-easy' : 'run-quality';
  add({ slot: 'runQ', kind: runQKind, minutes: d('runQ'), prefer: P.runQ, key: false, hard: runQKind === 'run-quality' && !recoveryLike && ctx.phase !== 'taper' });

  const strengthCount =
    ctx.phase === 'taper'
      ? n - ctx.week >= 2
        ? Math.min(1, settings.strengthPerWeek)
        : 0
      : ctx.phase === 'peak' || recoveryLike
        ? Math.min(1, settings.strengthPerWeek)
        : Math.min(2, settings.strengthPerWeek);
  if (strengthCount >= 1) add({ slot: 'strength1', kind: 'strength', minutes: d('strength'), prefer: P.strength1, key: false });
  if (ctx.phase !== 'foundation' && ctx.phase !== 'taper' && !recoveryLike && !soccerHeavy) {
    add({ slot: 'runEasy', kind: 'run-easy', minutes: d('runEasy'), prefer: P.runEasy, key: false, optional: true });
  }
  if (strengthCount >= 2) add({ slot: 'strength2', kind: 'strength', minutes: d('strength'), prefer: P.strength2, key: false, optional: true });
  if (!recoveryLike && ctx.phase !== 'foundation' && ctx.phase !== 'taper' && ctx.week < peakEnd) {
    add({ slot: 'bikeEasy', kind: 'bike-easy', minutes: d('bikeEasy'), prefer: P.bikeEasy, key: false, optional: true });
  }

  // ── Fitness tests replace a quality session ──
  const replace = (slot: string, kind: SessionKind, minutes: number) => {
    const s = specs.find((x) => x.slot === slot);
    if (s) {
      s.kind = kind;
      s.minutes = Math.max(s.minutes, minutes);
      s.hard = true;
      s.key = true;
    }
  };
  if (ctx.testWeek === 'baseline-1') {
    replace('swim2', 'swim-test', 40);
    replace('runQ', 'run-test', 50);
  } else if (ctx.testWeek === 'baseline-2') {
    replace('bikeQ', 'bike-test', 50);
  } else if (ctx.testWeek === 'full') {
    replace('swim2', 'swim-test', 40);
    replace('runQ', 'run-test', 50);
    replace('bikeQ', 'bike-test', 50);
  } else if (ctx.testWeek === 'swim') {
    replace('swim2', 'swim-test', 40);
  }

  return specs.filter((s) => s.minutes > 0 || s.kind === 'race');
}

/** Rough first-timer finish-time estimates, used for weekly totals and race-day fuel. */
export const RACE_MINUTES = { tuneUp: 150, half: 390, full: 840 };

// ───────────────────────── Scheduler ─────────────────────────

interface Placement {
  spec: Spec;
  day: Weekday;
  minutes: number;
}

function schedule(specs: Spec[], settings: PlanSettings, ctx: WeekContext) {
  const capacity = settings.availability.map((m) => Math.max(0, m));
  const placed: Placement[] = [];
  let unscheduled = 0;
  const dayBefore = (d: Weekday) => ((d + 6) % 7) as Weekday;

  const onDay = (d: Weekday) => placed.filter((p) => p.day === d);

  const valid = (s: Spec, d: Weekday) => {
    const today = onDay(d);
    if (s.sameDayAs) return today.some((p) => p.spec.slot === s.sameDayAs);
    if (today.length >= 2) return false;
    if (today.some((p) => p.spec.sport === s.sport)) return false;
    if (s.hard && today.some((p) => p.spec.hard)) return false;
    if (today.some((p) => p.spec.key && (p.spec.kind === 'bike-long' || p.spec.kind === 'run-long')) && s.sport !== 'swim') return false;
    // Keep the day before the long ride free of hard efforts and heavy lifting.
    if ((s.hard || s.sport === 'strength') && d === dayBefore(ctx.longRideDay) && !s.fixedDay) return false;
    return true;
  };

  for (const s of specs) {
    if (s.fixedDay !== undefined) {
      // Races, soccer and race-week sessions go where they belong regardless of availability.
      placed.push({ spec: s, day: s.fixedDay, minutes: s.minutes });
      capacity[s.fixedDay] = Math.max(0, capacity[s.fixedDay] - s.minutes);
      continue;
    }
    const min = s.kind === 'bike-long' ? 45 : s.kind === 'run-long' ? 30 : s.kind === 'run-brick' ? 10 : MIN_MINUTES[s.sport];
    const fallback = ([0, 1, 2, 3, 4, 5, 6] as Weekday[])
      .filter((d) => !s.prefer.includes(d))
      .sort((a, b) => capacity[b] - capacity[a]);
    const candidates = s.sameDayAs ? s.prefer : [...s.prefer, ...fallback];
    const usable = candidates.filter((d) => valid(s, d) && capacity[d] >= min);
    // Best fit: first candidate that holds the full session; otherwise the roomiest
    // preferred day (shortened); otherwise the roomiest day anywhere.
    const full = usable.find((d) => capacity[d] >= s.minutes);
    const preferredRoomy = usable
      .filter((d) => s.prefer.includes(d))
      .sort((a, b) => capacity[b] - capacity[a])[0];
    const anyRoomy = [...usable].sort((a, b) => capacity[b] - capacity[a])[0];
    const day = full ?? preferredRoomy ?? anyRoomy;
    if (day === undefined) {
      if (!s.optional) unscheduled += s.minutes;
      continue;
    }
    const minutes = Math.min(s.minutes, capacity[day]);
    placed.push({ spec: s, day, minutes });
    capacity[day] -= minutes;
    if (!s.optional) unscheduled += s.minutes - minutes;
  }
  return { placed, unscheduled };
}

// ───────────────────────── Public API ─────────────────────────

export interface PlanOverrides {
  /** session id → weekday it was moved to */
  moves?: Record<string, Weekday>;
}

export function generatePlan(
  profile: Profile,
  settings: PlanSettings,
  markers: Markers = {},
  overrides: PlanOverrides = {},
): PlanWeek[] {
  const n = totalWeeks(settings);
  if (n < 1) return [];
  const blocks = phaseLayout(n);
  const peakBlock = blocks.find((b) => b.phase === 'peak');
  const peakEnd = peakBlock ? peakBlock.end : n;
  const longRideDay = settings.longRideDay;
  const longRunDay = (longRideDay === 5 ? 6 : longRideDay === 6 ? 5 : (longRideDay + 1) % 7) as Weekday;

  const raceWeeks = new Map<number, string>();
  const base = blocks.find((b) => b.phase === 'base');
  const build = blocks.find((b) => b.phase === 'build');
  if (settings.includeTuneUpRace && base && base.end - base.start >= 3) raceWeeks.set(base.end, 'Tune-up race (Sprint or Olympic)');
  if (settings.include703 && build && build.end - build.start >= 3) raceWeeks.set(build.end, 'IRONMAN 70.3 (tune-up)');

  const weeks: PlanWeek[] = [];
  for (let w = 1; w <= n; w++) {
    const block = blocks.find((b) => w >= b.start && w <= b.end)!;
    const localWeek = w - block.start + 1;
    const phaseLength = block.end - block.start + 1;
    const raceLabel = raceWeeks.get(w);
    const afterRace = raceWeeks.has(w - 1) && raceWeeks.get(w - 1)!.includes('70.3');
    const training = block.phase !== 'taper' && block.phase !== 'race';
    let isRecovery =
      training && ((localWeek % 4 === 0 && !(block.phase === 'peak' && w === block.end)) || afterRace);
    if (raceLabel) isRecovery = true;
    const isBusy = settings.busyWeeks.includes(w) && block.phase !== 'race';
    const lastRecoveryInPhase =
      isRecovery && !raceLabel && training && block.phase !== 'peak' && localWeek + 4 > phaseLength;
    let testWeek: WeekContext['testWeek'] = null;
    if (w === 1 && n > 8) testWeek = 'baseline-1';
    else if (w === 2 && n > 8) testWeek = 'baseline-2';
    else if (lastRecoveryInPhase && !isBusy) testWeek = 'full';
    else if (isRecovery && !raceLabel && !isBusy && block.phase !== 'peak' && training) testWeek = 'swim';

    const ctx: WeekContext = {
      week: w,
      phase: block.phase,
      localWeek,
      phaseLength,
      isRecovery,
      isBusy,
      raceLabel,
      testWeek,
      preRace: raceWeeks.has(w + 1) && raceWeeks.get(w + 1)!.includes('70.3'),
      longRideDay,
      longRunDay,
    };

    const specs = specsForWeek(ctx, settings, n, peakEnd);
    const { placed, unscheduled } = schedule(specs, settings, ctx);
    const weekStart = addDays(settings.startDate, (w - 1) * 7);
    const planProgress = (w - 1) / Math.max(1, n - 1);

    const sessions: PlannedSession[] = placed.map((p) => {
      const id = `w${w}-${p.spec.slot}`;
      const day = overrides.moves?.[id] ?? p.day;
      const built = buildWorkout({
        kind: p.spec.kind,
        phase: block.phase === 'race' ? 'taper' : block.phase,
        minutes: p.minutes,
        week: w,
        planProgress,
        isRecovery: isRecovery || isBusy || block.phase === 'race',
        swimLevel: profile.levels.swim,
        cssSecPer100: markers.cssSecPer100,
        raceLabel: p.spec.raceLabel,
      });
      return {
        id,
        week: w,
        date: addDays(weekStart, day),
        weekday: day,
        sport: built.sport,
        kind: p.spec.kind,
        title: built.title,
        summary: built.summary,
        minutes: p.minutes,
        distanceM: built.distanceM,
        zone: built.zone,
        key: p.spec.key,
        steps: built.steps,
        notes: built.notes,
      };
    });
    sessions.sort((a, b) => a.weekday - b.weekday || sportOrder(a.sport) - sportOrder(b.sport));

    const plannedMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);
    const warnings: string[] = [];
    if (unscheduled >= 30 && unscheduled >= 0.12 * (plannedMinutes + unscheduled)) {
      warnings.push(
        `Your available time is about ${Math.round(unscheduled / 6) / 10} h short of this week's ideal. Key sessions were kept; extras were shortened or dropped.`,
      );
    }
    const longRide = specs.find((s) => s.slot === 'longRide');
    if (longRide && longRide.minutes > settings.availability[longRideDay] && block.phase === 'peak') {
      warnings.push(
        `This week's long ride wants ${Math.round(longRide.minutes / 6) / 10} h but you have ${Math.round(settings.availability[longRideDay] / 6) / 10} h on your long-ride day. Rides of 4.5–5.5 h before race day matter. Try to free up more weekend time for this phase.`,
      );
    }
    if (isBusy) warnings.push('Busy week: volume cut ~40%. Swims and the long sessions are kept short, everything else is optional.');

    weeks.push({
      week: w,
      startDate: weekStart,
      phase: block.phase,
      focus: raceLabel
        ? `${raceLabel}: mini-taper, race Sunday, learn and have fun.`
        : isRecovery
          ? 'Recovery week: about 35% less volume. Let the fitness sink in.'
          : PHASE_INFO[block.phase].focus,
      isRecovery,
      isBusy,
      raceLabel: block.phase === 'race' ? settings.raceName || 'IRONMAN' : raceLabel,
      sessions,
      plannedMinutes,
      unscheduledMinutes: unscheduled,
      warnings,
    });
  }
  return weeks;
}

function sportOrder(s: Sport): number {
  return ['swim', 'bike', 'run', 'soccer', 'strength', 'mobility', 'race'].indexOf(s);
}

/** Which plan week a date falls in (1-based), clamped to the plan. */
export function weekForDate(settings: Pick<PlanSettings, 'startDate' | 'raceDate'>, date: string): number {
  const n = totalWeeks(settings);
  const w = Math.floor(daysBetween(settings.startDate, date) / 7) + 1;
  return Math.min(n, Math.max(1, w));
}

export function sessionsOn(plan: PlanWeek[], date: string): PlannedSession[] {
  for (const w of plan) {
    if (date >= w.startDate && date <= addDays(w.startDate, 6)) return w.sessions.filter((s) => s.date === date);
  }
  return [];
}

/** Total planned minutes per sport for a week (excludes races). */
export function sportBreakdown(week: PlanWeek): Record<'swim' | 'bike' | 'run' | 'other', number> {
  const out = { swim: 0, bike: 0, run: 0, other: 0 };
  for (const s of week.sessions) {
    if (s.sport === 'swim' || s.sport === 'bike' || s.sport === 'run') out[s.sport] += s.minutes;
    else if (s.sport !== 'race') out.other += s.minutes;
  }
  return out;
}
