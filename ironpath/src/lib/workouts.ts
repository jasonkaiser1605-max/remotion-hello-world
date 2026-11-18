import { formatPace } from './dates';
import type { Phase, SessionKind, SkillLevel, Sport, WorkoutStep, Zone } from './types';

/** Everything the session builder needs to know to write a workout. */
export interface BuildContext {
  kind: SessionKind;
  phase: Phase;
  minutes: number;
  week: number;
  /** 0..1 progress through the whole plan, used to improve estimated swim pace. */
  planProgress: number;
  isRecovery: boolean;
  swimLevel: SkillLevel;
  cssSecPer100?: number;
  raceLabel?: string;
}

export interface BuiltWorkout {
  sport: Sport;
  title: string;
  summary: string;
  zone: Zone;
  distanceM?: number;
  steps: WorkoutStep[];
  notes: string[];
}

const SWIM_PACE_BY_LEVEL: Record<SkillLevel, number> = {
  new: 185,
  weak: 165,
  okay: 140,
  decent: 125,
  strong: 110,
};

/** Estimated average pace per 100 m *including* rest and drills. */
export function swimSessionPace(level: SkillLevel, progress: number, css?: number): number {
  if (css) return css + 20;
  // Beginners typically improve 10–15% over a year of consistent swimming.
  return Math.round(SWIM_PACE_BY_LEVEL[level] * (1 - 0.12 * Math.min(1, Math.max(0, progress))));
}

function roundTo(n: number, step: number): number {
  return Math.max(step, Math.round(n / step) * step);
}

const DRILLS = [
  { name: 'Side kick', cue: 'Lie on your side, bottom arm extended, kick and rotate to breathe. Builds balance.' },
  { name: 'Catch-up', cue: 'One hand waits in front until the other arrives. Lengthens your stroke.' },
  { name: 'Fingertip drag', cue: 'Drag fingertips along the surface on recovery. High elbow, relaxed shoulder.' },
  { name: '6-kick switch', cue: '6 kicks on your side, 1 stroke to switch sides. Rotation from the hips.' },
  { name: 'Single arm', cue: 'One arm only, other at your side. Breathe to the non-working side.' },
  { name: 'Fist drill', cue: 'Swim with closed fists. Teaches you to catch with the forearm.' },
  { name: 'Sculling', cue: 'Arms out front, small figure-8 sweeps. Feel the water / pressure on your palms.' },
  { name: 'Breathe every 3', cue: 'Bilateral breathing. Exhale steadily underwater, no breath holding.' },
];

function pick<T>(arr: readonly T[], week: number): T {
  return arr[week % arr.length];
}

function fuelNotes(minutes: number, sport: Sport): string[] {
  if (sport === 'strength' || sport === 'soccer') return [];
  if (minutes >= 150)
    return [
      'Fuel: 60–90 g carbs per hour (gels, chews, drink mix) + 500–750 mL fluid and ~500 mg sodium per hour. This is gut training. Race day depends on it.',
      'Eat a carb-rich meal 2–3 h before you start.',
    ];
  if (minutes >= 75) return ['Fuel: 30–60 g carbs per hour + a bottle (500–750 mL) per hour.'];
  return ['Water is enough for this one. Have a carb + protein snack afterwards if you train again within 24 h.'];
}

export function buildWorkout(ctx: BuildContext): BuiltWorkout {
  switch (ctx.kind) {
    case 'swim-technique':
    case 'swim-endurance':
    case 'swim-css':
    case 'swim-openwater':
    case 'swim-test':
      return buildSwim(ctx);
    case 'bike-long':
    case 'bike-quality':
    case 'bike-easy':
    case 'bike-test':
      return buildBike(ctx);
    case 'run-long':
    case 'run-quality':
    case 'run-easy':
    case 'run-brick':
    case 'run-test':
      return buildRun(ctx);
    case 'strength':
      return buildStrength(ctx);
    case 'soccer':
      return {
        sport: 'soccer',
        title: 'Soccer',
        summary: 'Practice or game. Counts as your high-intensity session today.',
        zone: 4,
        steps: [{ label: 'Soccer', amount: `${ctx.minutes} min`, detail: 'Sprints, cuts and jumps all count as training load.' }],
        notes: [
          'Soccer is intense, stop-and-go running, so the app treats it as a hard day.',
          'Keep the rest of today easy and avoid stacking another hard session right after it.',
        ],
      };
    case 'mobility':
      return {
        sport: 'mobility',
        title: 'Mobility & foam roll',
        summary: 'Easy 15–20 min: hips, calves, thoracic spine, shoulders.',
        zone: 1,
        steps: [{ label: 'Mobility', amount: `${ctx.minutes} min` }],
        notes: [],
      };
    case 'race':
      return buildRace(ctx);
  }
}

// ───────────────────────────── SWIM ─────────────────────────────

function buildSwim(ctx: BuildContext): BuiltWorkout {
  const pace = swimSessionPace(ctx.swimLevel, ctx.planProgress, ctx.cssSecPer100);
  const total = roundTo((ctx.minutes * 60 * 100) / pace, 50);
  const warm = total >= 2200 ? 300 : 200;
  const cool = total >= 2500 ? 200 : 100;
  const drill = pick(DRILLS, ctx.week);
  const drill2 = pick(DRILLS, ctx.week + 3);
  const cssText = ctx.cssSecPer100 ? ` (~${formatPace(ctx.cssSecPer100)}/100 m)` : '';
  const notes: string[] = [];

  if (ctx.kind === 'swim-test') {
    return {
      sport: 'swim',
      title: 'Swim test: CSS (400 m + 200 m)',
      summary: 'Time a 400 m and a 200 m all-out. Enter both times in Settings to set your swim paces.',
      zone: 4,
      distanceM: 1300,
      steps: [
        { label: 'Warm-up', amount: '300 m', detail: 'Easy, include 4 × 25 m build', zone: 1 },
        { label: 'Time trial', amount: '400 m', detail: 'Steady-hard, even pacing. Record the time.', zone: 4 },
        { label: 'Recover', amount: '200 m', detail: 'Very easy + rest 5 min', zone: 1 },
        { label: 'Time trial', amount: '200 m', detail: 'Hard. Record the time.', zone: 5 },
        { label: 'Cool-down', amount: '200 m', zone: 1 },
      ],
      notes: ['Retest every ~8 weeks. Watching this number drop is the best motivation for a weak swimmer.'],
    };
  }

  if (ctx.kind === 'swim-technique') {
    const drillM = Math.min(400, Math.max(200, roundTo(total * 0.3, 50)));
    const main = Math.max(100, total - warm - cool - drillM);
    const reps = Math.max(2, Math.round(main / 50));
    notes.push(`Focus cue: ${drill.cue}`);
    notes.push('Fins and a pull buoy are allowed. They help you feel good body position while learning.');
    return {
      sport: 'swim',
      title: 'Swim: technique',
      summary: `${total} m · drills: ${drill.name} + ${drill2.name}`,
      zone: 2,
      distanceM: total,
      steps: [
        { label: 'Warm-up', amount: `${warm} m`, detail: 'Easy freestyle, rest as needed', zone: 1 },
        { label: 'Drills', amount: `${drillM / 50} × 50 m`, detail: `25 m ${drill.name} / 25 m swim · alternate with ${drill2.name} · 20 s rest`, zone: 1 },
        { label: 'Main', amount: `${reps} × 50 m`, detail: 'Smooth and relaxed, long strokes, breathe every 3 · 20–30 s rest', zone: 2 },
        { label: 'Cool-down', amount: `${cool} m`, detail: 'Easy, any stroke', zone: 1 },
      ],
      notes,
    };
  }

  if (ctx.kind === 'swim-css') {
    const main = Math.max(400, total - warm - cool - 200);
    const repDist = ctx.phase === 'peak' ? 200 : 100;
    const reps = Math.max(3, Math.round(main / repDist));
    return {
      sport: 'swim',
      title: 'Swim: threshold (CSS) set',
      summary: `${total} m · ${reps} × ${repDist} m at CSS pace${cssText}`,
      zone: 4,
      distanceM: total,
      steps: [
        { label: 'Warm-up', amount: `${warm} m`, zone: 1 },
        { label: 'Drills', amount: '4 × 50 m', detail: `${drill.name} / swim`, zone: 1 },
        { label: 'Main', amount: `${reps} × ${repDist} m`, detail: `At CSS${cssText}, ${repDist === 100 ? '15' : '20'} s rest. Even splits!`, zone: 4 },
        { label: 'Cool-down', amount: `${cool} m`, zone: 1 },
      ],
      notes: ['If you haven’t done the CSS test yet, swim these "comfortably hard", the pace you could hold for ~30 min.'],
    };
  }

  if (ctx.kind === 'swim-openwater') {
    const main = Math.max(400, total - warm - cool);
    return {
      sport: 'swim',
      title: 'Open-water skills',
      summary: `${total} m in open water (or pool, simulated)`,
      zone: 2,
      distanceM: total,
      steps: [
        { label: 'Warm-up', amount: `${warm} m`, detail: 'Get used to the wetsuit and cold water, exhale fully', zone: 1 },
        { label: 'Sighting', amount: '6 × 100 m', detail: 'Lift eyes ("crocodile eyes") every 6–8 strokes, then breathe to the side', zone: 2 },
        { label: 'Main', amount: `${main - 600 > 0 ? main - 600 : 400} m`, detail: 'Continuous, steady. Practice swimming straight and drafting behind a buddy', zone: 2 },
        { label: 'Cool-down', amount: `${cool} m`, zone: 1 },
      ],
      notes: [
        'Never swim open water alone. Go with a group, a buddy, or a lifeguarded beach, and use a bright tow float.',
        'No open water nearby? In the pool: sight on a water bottle at the wall, do 3-strokes-eyes-closed to test how straight you swim, and start some reps with a "mass start" sprint.',
      ],
    };
  }

  // swim-endurance
  let repDist = 100;
  if (ctx.phase === 'base') repDist = 200;
  if (ctx.phase === 'build') repDist = 300;
  if (ctx.phase === 'peak') repDist = 500;
  if (ctx.phase === 'taper' || ctx.isRecovery) repDist = 100;
  const main = Math.max(repDist * 2, total - warm - cool - 200);
  const reps = Math.max(2, Math.round(main / repDist));
  return {
    sport: 'swim',
    title: 'Swim: aerobic endurance',
    summary: `${total} m · ${reps} × ${repDist} m steady`,
    zone: 2,
    distanceM: total,
    steps: [
      { label: 'Warm-up', amount: `${warm} m`, zone: 1 },
      { label: 'Drills', amount: '4 × 50 m', detail: `${drill.name} / swim`, zone: 1 },
      { label: 'Main', amount: `${reps} × ${repDist} m`, detail: `Steady, relaxed${ctx.cssSecPer100 ? ` (~${formatPace(ctx.cssSecPer100 + 8)}/100 m)` : ''}, 20–30 s rest. Bilateral breathing.`, zone: 2 },
      { label: 'Cool-down', amount: `${cool} m`, zone: 1 },
    ],
    notes: [ctx.phase === 'peak' ? 'Goal this phase: swim 3,800 m continuously at least twice before race day.' : 'Goal: hold good form when tired. Stop a rep early rather than thrash.'],
  };
}

// ───────────────────────────── BIKE ─────────────────────────────

function buildBike(ctx: BuildContext): BuiltWorkout {
  const m = ctx.minutes;
  if (ctx.kind === 'bike-test') {
    return {
      sport: 'bike',
      title: 'Bike test: 20-min threshold',
      summary: 'Warm up, then ride 20 min as hard as you can hold evenly (trainer or flat road).',
      zone: 4,
      steps: [
        { label: 'Warm-up', amount: '15 min', detail: 'Easy, with 3 × 1 min high cadence', zone: 2 },
        { label: 'Openers', amount: '3 × 1 min', detail: 'Hard, 1 min easy between', zone: 4 },
        { label: 'Test', amount: '20 min', detail: 'Best sustainable effort. Note avg power (× 0.95 = FTP) and avg HR (≈ bike LTHR).', zone: 4 },
        { label: 'Cool-down', amount: `${Math.max(10, m - 45)} min`, zone: 1 },
      ],
      notes: ['Pace it like a slow-burning candle: start controlled, finish strong.'],
    };
  }
  if (ctx.kind === 'bike-easy') {
    return {
      sport: 'bike',
      title: 'Easy spin',
      summary: `${m} min easy, high cadence (85–95 rpm)`,
      zone: 1,
      steps: [{ label: 'Spin', amount: `${m} min`, detail: 'Z1–Z2, light gears. Great on a trainer or as a commute.', zone: 1 }],
      notes: ['If life is busy, this is the first session to skip.'],
    };
  }
  if (ctx.kind === 'bike-long') {
    const steps: WorkoutStep[] = [{ label: 'Warm-up', amount: '15 min', detail: 'Easy spin', zone: 1 }];
    if (ctx.phase === 'peak' && !ctx.isRecovery && m >= 180) {
      const blocks = m >= 270 ? 3 : 2;
      steps.push({ label: 'Endurance', amount: `${Math.round((m - 15 - blocks * 30 - 15) / 2)} min`, detail: 'Steady Z2', zone: 2 });
      steps.push({ label: 'Ironman pace', amount: `${blocks} × 30 min`, detail: 'Upper Z2 / low Z3 on aero position if you have it, 10 min easy between', zone: 3 });
      steps.push({ label: 'Endurance', amount: `${Math.round((m - 15 - blocks * 30 - 15) / 2)} min`, detail: 'Steady Z2', zone: 2 });
    } else if (ctx.phase === 'build' && !ctx.isRecovery) {
      steps.push({ label: 'Endurance', amount: `${m - 15 - 40 - 10} min`, detail: 'Steady Z2', zone: 2 });
      steps.push({ label: '70.3 pace', amount: '2 × 20 min', detail: 'Low Z3, 5 min easy between', zone: 3 });
    } else {
      steps.push({ label: 'Endurance', amount: `${Math.max(10, m - 25)} min`, detail: 'Steady Z2. Practice drinking and eating while riding.', zone: 2 });
    }
    steps.push({ label: 'Cool-down', amount: '10 min', zone: 1 });
    return {
      sport: 'bike',
      title: 'Long ride',
      summary: `${m} min mostly Zone 2${ctx.phase === 'peak' ? ' with Ironman-pace blocks' : ''}`,
      zone: 2,
      steps,
      notes: [
        ...fuelNotes(m, 'bike'),
        ctx.phase === 'foundation'
          ? 'Ride solo or with a group that rides easy. Bike handling (cornering, grabbing a bottle) counts as training.'
          : 'Keep it aerobic. Riding the long ride too hard is the #1 Ironman training mistake.',
      ],
    };
  }
  // bike-quality
  if (ctx.isRecovery || ctx.phase === 'taper') {
    return {
      sport: 'bike',
      title: 'Bike: openers',
      summary: `${m} min easy with short pick-ups`,
      zone: 2,
      steps: [
        { label: 'Easy', amount: `${Math.max(10, m - 15)} min`, zone: 2 },
        { label: 'Pick-ups', amount: '5 × 1 min', detail: 'Tempo, 1 min easy between', zone: 3 },
      ],
      notes: [],
    };
  }
  const table: Record<string, { title: string; main: WorkoutStep; zone: Zone; note: string }> = {
    foundation: {
      title: 'Bike: cadence & skills',
      main: { label: 'Drills', amount: '6 × (1 min high cadence 100+ rpm / 2 min easy) + 4 × 1 min single-leg (trainer)', detail: 'Smooth pedal stroke, no bouncing', zone: 2 },
      zone: 2,
      note: 'Pedalling efficiency now = free speed later.',
    },
    base: {
      title: 'Bike: tempo / sweet spot',
      main: { label: 'Main', amount: ctx.week % 2 ? '3 × 12 min' : '2 × 18 min', detail: 'Z3 (~85–90% FTP), 4–5 min easy between, steady cadence 85–90', zone: 3 },
      zone: 3,
      note: 'This builds the muscular endurance that lets you hold race pace for hours.',
    },
    build: {
      title: 'Bike: threshold intervals',
      main: { label: 'Main', amount: ctx.week % 2 ? '4 × 8 min' : '3 × 12 min', detail: 'Z4 (~95–100% FTP), 4 min easy between', zone: 4 },
      zone: 4,
      note: 'Hard but controlled. The last rep should be as strong as the first.',
    },
    peak: {
      title: 'Bike: race-pace + over/unders',
      main: { label: 'Main', amount: '3 × 15 min', detail: 'Alternate 4 min Z3 / 1 min Z4 inside each block, 5 min easy between', zone: 3 },
      zone: 3,
      note: 'Teaches you to handle surges (hills, passing) without burning matches.',
    },
  };
  const t = table[ctx.phase] ?? table.base;
  return {
    sport: 'bike',
    title: t.title,
    summary: `${m} min · ${t.main.amount}`,
    zone: t.zone,
    steps: [
      { label: 'Warm-up', amount: '12 min', detail: 'Easy, build cadence', zone: 1 },
      t.main,
      { label: 'Cool-down', amount: '8 min', zone: 1 },
    ],
    notes: [t.note, 'Indoor trainer is perfect for this: time-efficient and safe.'],
  };
}

// ───────────────────────────── RUN ─────────────────────────────

function buildRun(ctx: BuildContext): BuiltWorkout {
  const m = ctx.minutes;
  if (ctx.kind === 'run-test') {
    return {
      sport: 'run',
      title: 'Run test: 30-min threshold',
      summary: 'Run 30 min solo at the hardest pace you can hold evenly. Avg HR of the last 20 min = your LTHR.',
      zone: 4,
      steps: [
        { label: 'Warm-up', amount: '15 min', detail: 'Easy + 4 strides', zone: 1 },
        { label: 'Test', amount: '30 min', detail: 'Even, all-out effort (track or flat loop). Lap at 10 min.', zone: 4 },
        { label: 'Cool-down', amount: `${Math.max(10, m - 45)} min`, zone: 1 },
      ],
      notes: ['Enter the result in Settings → Zones and all your heart rate zones update.'],
    };
  }
  if (ctx.kind === 'run-brick') {
    return {
      sport: 'run',
      title: 'Brick run',
      summary: `${m} min run straight off the bike`,
      zone: 2,
      steps: [
        { label: 'Transition', amount: '< 5 min', detail: 'Rack bike, shoes on, go. Practice your T2 routine.' },
        { label: 'Run', amount: `${m} min`, detail: 'First 5 min: short quick steps (cadence ~170–180). Then settle into Z2.', zone: 2 },
      ],
      notes: ['"Jelly legs" fade with practice. That adaptation is the whole point of bricks.'],
    };
  }
  if (ctx.kind === 'run-easy') {
    return {
      sport: 'run',
      title: 'Easy run + strides',
      summary: `${m} min Zone 2 · 4–6 × 20 s strides`,
      zone: 2,
      steps: [
        { label: 'Easy', amount: `${Math.max(10, m - 5)} min`, detail: 'Conversational. Slow down on hills to stay in Z2.', zone: 2 },
        { label: 'Strides', amount: '4–6 × 20 s', detail: 'Smooth, fast, relaxed, full recovery', zone: 4 },
      ],
      notes: ['Soccer gives you speed. Triathlon needs patience. Easy should feel almost too easy.'],
    };
  }
  if (ctx.kind === 'run-long') {
    const steps: WorkoutStep[] = [];
    if (ctx.phase === 'peak' && !ctx.isRecovery && m >= 90) {
      steps.push({ label: 'Easy', amount: '20 min', zone: 2 });
      steps.push({ label: 'Ironman pace', amount: `${m >= 120 ? '3' : '2'} × 20 min`, detail: 'Steady Z2 (upper). Take a gel + water every 30–40 min. Practice walking aid stations for 15 s.', zone: 2 });
      steps.push({ label: 'Easy', amount: `${Math.max(10, m - 20 - (m >= 120 ? 60 : 40))} min`, zone: 2 });
    } else if (ctx.phase === 'build' && !ctx.isRecovery) {
      steps.push({ label: 'Easy', amount: `${Math.max(20, m - 20)} min`, zone: 2 });
      steps.push({ label: 'Finish', amount: '20 min', detail: '70.3 race pace (low Z3)', zone: 3 });
    } else {
      steps.push({ label: 'Long easy', amount: `${m} min`, detail: 'Zone 2 the whole way. Run/walk is fine.', zone: 2 });
    }
    return {
      sport: 'run',
      title: 'Long run',
      summary: `${m} min mostly Zone 2`,
      zone: 2,
      steps,
      notes: [
        ...fuelNotes(m, 'run'),
        'Long runs are capped around 2.5 h. Longer adds injury risk faster than fitness.',
      ],
    };
  }
  // run-quality
  if (ctx.isRecovery || ctx.phase === 'taper') {
    return {
      sport: 'run',
      title: 'Run: easy + strides',
      summary: `${m} min easy with strides`,
      zone: 2,
      steps: [
        { label: 'Easy', amount: `${Math.max(10, m - 5)} min`, zone: 2 },
        { label: 'Strides', amount: '4 × 20 s', zone: 4 },
      ],
      notes: [],
    };
  }
  const table: Record<string, { title: string; main: WorkoutStep; zone: Zone; note: string }> = {
    foundation: {
      title: 'Run: form & strides',
      main: { label: 'Drills + strides', amount: '2 × (A-skips, B-skips, butt kicks 20 m) + 6 × 20 s strides', detail: 'Tall posture, quick light feet', zone: 3 },
      zone: 2,
      note: 'Good mechanics now = fewer injuries when the volume climbs.',
    },
    base: {
      title: ctx.week % 2 ? 'Run: hill repeats' : 'Run: tempo',
      main: ctx.week % 2
        ? { label: 'Hills', amount: '6–8 × 60 s uphill', detail: 'Strong (Z4), jog down to recover', zone: 4 }
        : { label: 'Tempo', amount: '3 × 8 min', detail: 'Z3, 2 min jog between', zone: 3 },
      zone: 3,
      note: 'Hills = strength work in disguise.',
    },
    build: {
      title: 'Run: threshold intervals',
      main: { label: 'Main', amount: '5 × 5 min', detail: 'Z4, 2 min jog between', zone: 4 },
      zone: 4,
      note: 'Skip this if you have soccer the same week. Soccer already covers your speed work.',
    },
    peak: {
      title: 'Run: steady race-pace',
      main: { label: 'Main', amount: '2 × 15 min', detail: 'Ironman → 70.3 pace (Z2 high / Z3 low), 3 min jog', zone: 3 },
      zone: 3,
      note: 'Dial in the pace you can hold for the marathon after 112 miles.',
    },
  };
  const t = table[ctx.phase] ?? table.base;
  return {
    sport: 'run',
    title: t.title,
    summary: `${m} min · ${t.main.amount}`,
    zone: t.zone,
    steps: [
      { label: 'Warm-up', amount: '12 min', detail: 'Easy jog', zone: 1 },
      t.main,
      { label: 'Cool-down', amount: `${Math.max(5, m - 35)} min`, zone: 1 },
    ],
    notes: [t.note],
  };
}

// ─────────────────────────── STRENGTH ───────────────────────────

function buildStrength(ctx: BuildContext): BuiltWorkout {
  const a = ctx.week % 2 === 0;
  const maintenance = ctx.phase === 'peak' || ctx.phase === 'taper' || ctx.isRecovery;
  const sets = maintenance ? '2' : '3';
  const steps: WorkoutStep[] = a
    ? [
        { label: 'Squat (back or goblet)', amount: `${sets} × 6–8`, detail: 'Heavy but crisp. Leave 2 reps in the tank' },
        { label: 'Romanian deadlift', amount: `${sets} × 8` },
        { label: 'Bulgarian split squat', amount: `${sets} × 8 / leg`, detail: 'Single-leg strength = run economy + knee health' },
        { label: 'Calf raises (straight + bent knee)', amount: `${sets} × 15`, detail: 'Achilles insurance' },
        { label: 'Pallof press + dead bug', amount: `${sets} × 10 / side` },
      ]
    : [
        { label: 'Pull-ups / lat pulldown', amount: `${sets} × 6–10`, detail: 'Your swim engine' },
        { label: 'Single-arm DB row', amount: `${sets} × 10 / side` },
        { label: 'Push-ups', amount: `${sets} × 12–15` },
        { label: 'Band external rotations + face pulls', amount: `${sets} × 15`, detail: 'Shoulder health for swimming' },
        { label: 'Hip bridge / single-leg bridge', amount: `${sets} × 12` },
        { label: 'Plank + side plank', amount: `${sets} × 40 s` },
      ];
  return {
    sport: 'strength',
    title: a ? 'Strength A: legs + core' : 'Strength B: upper + swim support',
    summary: maintenance ? `${ctx.minutes} min maintenance (2 sets)` : `${ctx.minutes} min`,
    zone: 3,
    steps,
    notes: [
      'You already lift, so keep it. Lifting makes triathletes more durable.',
      'Do heavy legs on a hard day (or right after a quality session), never the day before your long ride or run.',
      ...(ctx.phase === 'peak' ? ['Peak phase: maintain, don’t build. Drop the load ~20% and stop well short of failure.'] : []),
    ],
  };
}

// ───────────────────────────── RACE ─────────────────────────────

function buildRace(ctx: BuildContext): BuiltWorkout {
  const label = ctx.raceLabel ?? 'Race';
  if (/70\.3/.test(label)) {
    return {
      sport: 'race',
      title: label,
      summary: '1.9 km swim · 90 km bike · 21.1 km run',
      zone: 3,
      distanceM: 113000,
      steps: [
        { label: 'Swim', amount: '1.9 km / 1.2 mi', detail: 'Start at the back/side, find your rhythm, sight often' },
        { label: 'Bike', amount: '90 km / 56 mi', detail: 'Low Z3. Eat & drink every 15–20 min (60–90 g carbs/h)' },
        { label: 'Run', amount: '21.1 km / 13.1 mi', detail: 'First 5 km easier than you think, then hold' },
      ],
      notes: ['This is your full dress rehearsal: test nutrition, pacing, transitions and gear exactly as planned for Ironman day.'],
    };
  }
  if (/sprint|olympic|tune/i.test(label)) {
    return {
      sport: 'race',
      title: label,
      summary: 'Sprint (750 m / 20 km / 5 km) or Olympic (1.5 km / 40 km / 10 km)',
      zone: 4,
      steps: [
        { label: 'Swim', amount: '750 m – 1.5 km' },
        { label: 'Bike', amount: '20 – 40 km' },
        { label: 'Run', amount: '5 – 10 km' },
      ],
      notes: ['Goal: learn race-day logistics (transition setup, wetsuit, mass start) with low stakes. Have fun with it.'],
    };
  }
  return {
    sport: 'race',
    title: label,
    summary: '3.8 km swim · 180 km bike · 42.2 km run (140.6 mi)',
    zone: 2,
    distanceM: 226000,
    steps: [
      { label: 'Swim', amount: '3.8 km / 2.4 mi', detail: 'Calm, steady, sight every 6–8 strokes. Typical cutoff 2 h 20 min' },
      { label: 'Bike', amount: '180 km / 112 mi', detail: 'Z2, ride your own race. Eat 60–90 g carbs/h. Typical cutoff ~10 h 30 min from start' },
      { label: 'Run', amount: '42.2 km / 26.2 mi', detail: 'Walk the aid stations, keep fueling. Finish within 17 h' },
    ],
    notes: ['Nothing new on race day. You trained for this for a year. Smile at the finish line: you are an IRONMAN.'],
  };
}
