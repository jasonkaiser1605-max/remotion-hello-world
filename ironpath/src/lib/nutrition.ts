import type { Lifestyle, Profile, Sport, TrainingTime, Zone } from './types';

// Evidence base: carbohydrate & protein ranges follow the IOC / ACSM / Academy of
// Nutrition and Dietetics joint position on nutrition for athletic performance.

export type NutritionGoal = 'perform' | 'lean' | 'gain';

export type DayLoad = 'rest' | 'light' | 'moderate' | 'high' | 'veryHigh';

export const DAY_LOAD_INFO: Record<DayLoad, { label: string; carbsPerKg: number; blurb: string }> = {
  rest: { label: 'Rest day', carbsPerKg: 3.5, blurb: 'Lower carbs, plenty of protein, fruit and veg. Recovery happens today.' },
  light: { label: 'Light day', carbsPerKg: 4.5, blurb: 'Normal balanced meals. No need to carb-load.' },
  moderate: { label: 'Training day', carbsPerKg: 6, blurb: 'Carbs around your session; protein at every meal.' },
  high: { label: 'Big training day', carbsPerKg: 7, blurb: 'Eat more carbs today, especially before and after training.' },
  veryHigh: { label: 'Very big day', carbsPerKg: 8.5, blurb: 'Long-session day: carb-rich meals, fuel during, refuel fast after.' },
};

/** Mifflin–St Jeor resting metabolic rate (kcal/day). */
export function bmr(p: Pick<Profile, 'sex' | 'weightKg' | 'heightCm' | 'age'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(p.sex === 'male' ? base + 5 : base - 161);
}

export function lifestyleFactor(l: Lifestyle): number {
  return l === 'desk' ? 1.3 : l === 'onFeet' ? 1.45 : 1.6;
}

const MET: Record<Sport, number[]> = {
  // index 0..4 = zone 1..5
  swim: [5.5, 7, 8.5, 9.8, 11],
  bike: [5.5, 7, 8.5, 10, 12],
  run: [7, 9, 10.5, 11.5, 12.5],
  strength: [4, 5, 5.5, 6, 6],
  soccer: [6, 7, 8, 9, 10],
  mobility: [2.5, 2.5, 2.5, 2.5, 2.5],
  race: [8, 9, 10, 11, 12],
};

/**
 * Net (above-resting) kcal for a session. 1 MET ≈ 1 kcal/kg/h; we subtract the resting
 * MET because resting burn is already counted in BMR × lifestyle.
 */
export function estimateSessionKcal(sport: Sport, zone: Zone, minutes: number, weightKg: number): number {
  const met = MET[sport][zone - 1];
  return Math.round((met - 1) * weightKg * (minutes / 60));
}

export function dayLoadFor(totalMinutes: number, longestMinutes: number): DayLoad {
  if (totalMinutes <= 0) return 'rest';
  if (longestMinutes >= 150 || totalMinutes >= 210) return 'veryHigh';
  if (totalMinutes >= 90) return 'high';
  if (totalMinutes >= 50) return 'moderate';
  return 'light';
}

export interface SessionLike {
  sport: Sport;
  zone: Zone;
  minutes: number;
  /** Measured active kcal (from Apple Health) wins over the estimate when present. */
  kcal?: number;
}

export interface DailyTargets {
  load: DayLoad;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  exerciseKcal: number;
  restingKcal: number;
  carbsPerKg: number;
  waterMl: number;
}

export function dailyTargets(
  profile: Profile,
  sessions: SessionLike[],
  opts: { goal?: NutritionGoal; sweatRateMlPerHr?: number } = {},
): DailyTargets {
  const goal = opts.goal ?? 'perform';
  const kg = profile.weightKg;
  const active = sessions.filter((s) => s.sport !== 'mobility');
  const total = active.reduce((s, x) => s + x.minutes, 0);
  const longest = active.reduce((m, x) => Math.max(m, x.minutes), 0);
  const load = dayLoadFor(total, longest);
  const exerciseKcal = active.reduce(
    (sum, s) => sum + (s.kcal ?? estimateSessionKcal(s.sport, s.zone, s.minutes, kg)),
    0,
  );
  const restingKcal = Math.round(bmr(profile) * lifestyleFactor(profile.lifestyle));

  let carbsPerKg = DAY_LOAD_INFO[load].carbsPerKg;
  let proteinPerKg = 1.8;
  let adjust = 0;
  if (goal === 'lean') {
    proteinPerKg = 2.0;
    // Only trim on easy days. Never under-fuel key sessions.
    if (load === 'rest' || load === 'light') {
      adjust = -300;
      carbsPerKg -= 0.5;
    }
  } else if (goal === 'gain') {
    adjust = 300;
    carbsPerKg += 0.5;
  }

  const proteinG = Math.round(proteinPerKg * kg);
  const carbsG = Math.round(carbsPerKg * kg);
  const energy = restingKcal + exerciseKcal + adjust;
  const minFat = Math.round(0.8 * kg);
  const fatFromRemainder = Math.round((energy - proteinG * 4 - carbsG * 4) / 9);
  const fatG = Math.max(minFat, fatFromRemainder);
  const kcal = Math.round(proteinG * 4 + carbsG * 4 + fatG * 9);

  return {
    load,
    kcal,
    proteinG,
    carbsG,
    fatG,
    exerciseKcal,
    restingKcal,
    carbsPerKg,
    waterMl: hydrationTargetMl(kg, total, opts.sweatRateMlPerHr),
  };
}

// ─────────────────────────── Hydration ───────────────────────────

/** Baseline ~35 mL/kg plus ~80% of sweat losses during training. */
export function hydrationTargetMl(weightKg: number, trainingMinutes: number, sweatRateMlPerHr = 700): number {
  const base = 35 * weightKg;
  const training = 0.8 * sweatRateMlPerHr * (trainingMinutes / 60);
  return Math.round((base + training) / 50) * 50;
}

/**
 * Sweat-rate test: weigh yourself (no clothes) before and after a ~60 min session.
 * Returns mL per hour.
 */
export function sweatRate(preKg: number, postKg: number, drankMl: number, minutes: number): number {
  const lossMl = (preKg - postKg) * 1000 + drankMl;
  return Math.max(0, Math.round(lossMl / (minutes / 60)));
}

export function fuelingDuring(minutes: number): string {
  if (minutes < 60) return 'Water only. No fuel needed for under an hour.';
  if (minutes < 150) return '30–60 g carbs per hour (1 gel ≈ 22–25 g, 1 banana ≈ 27 g) + 500–750 mL fluid per hour.';
  return '60–90 g carbs per hour from mixed sources (glucose + fructose: drink mix + gels/chews), 500–750 mL fluid and 400–700 mg sodium per hour. Start eating in the first 20 minutes.';
}

// ─────────────────────────── Meal timing ───────────────────────────

export interface MealTip {
  when: string;
  title: string;
  detail: string;
  emphasis?: boolean;
}

const SESSION_CLOCK: Record<TrainingTime, number> = { morning: 6.5, midday: 12, evening: 17.5 };

function clock(h: number): string {
  const hh = Math.floor(((h % 24) + 24) % 24);
  const mm = Math.round((h - Math.floor(h)) * 60);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
}

export function mealTimeline(
  profile: Profile,
  todaysSessions: SessionLike[],
  trainingTime: TrainingTime,
  tomorrowLongestMinutes = 0,
): MealTip[] {
  const kg = profile.weightKg;
  const pMeal = Math.round(0.4 * kg); // ~0.4 g/kg protein per meal, 4–5×/day
  const active = todaysSessions.filter((s) => s.sport !== 'mobility');
  const minutes = active.reduce((s, x) => s + x.minutes, 0);
  const longest = active.reduce((m, x) => Math.max(m, x.minutes), 0);
  const tips: MealTip[] = [];

  if (active.some((s) => s.sport === 'race')) {
    return [
      { when: '3 h before start', title: 'Race breakfast', detail: `${Math.round(2 * kg)}–${Math.round(3 * kg)} g carbs you have practised with (bagels, white rice, oats, banana, honey, sports drink). Low fiber & fat. Coffee if that's your routine.`, emphasis: true },
      { when: '15 min before', title: 'Final top-up', detail: 'One gel with a few sips of water.' },
      { when: 'Bike', title: 'Fuel the bike', detail: '60–90 g carbs per hour, 500–750 mL fluid and 500–1000 mg sodium per hour. Eat early and often (every 15–20 min). The bike is where you set up your marathon.', emphasis: true },
      { when: 'Run', title: 'Fuel the run', detail: '30–60+ g carbs per hour at aid stations (gels, cola, sports drink). Walk the aid stations so you actually get it down.', emphasis: true },
      { when: 'After', title: 'Recover', detail: 'Eat whatever sounds good and drink. You earned it. Protein + carbs within a couple of hours.' },
    ];
  }

  if (minutes === 0) {
    tips.push(
      { when: '7:30 AM', title: 'Breakfast', detail: `~${pMeal} g protein (eggs, Greek yogurt) + oats or toast + fruit.` },
      { when: '12:30 PM', title: 'Lunch', detail: `~${pMeal} g protein + whole grains + a big serving of vegetables.` },
      { when: '3:30 PM', title: 'Snack', detail: 'Fruit + nuts, or cottage cheese / a protein shake.' },
      { when: '7:00 PM', title: 'Dinner', detail: `~${pMeal} g protein (chicken, fish, tofu, lentils) + potatoes or rice + veg.` },
      { when: '9:30 PM', title: 'Before bed', detail: '~30–40 g slow protein (Greek yogurt, cottage cheese, casein) supports overnight recovery.' },
    );
  } else {
    const start = SESSION_CLOCK[trainingTime];
    const end = start + longest / 60;
    const preCarbs = Math.round((longest >= 90 ? 1.5 : 1) * kg);
    if (trainingTime === 'morning') {
      tips.push({
        when: clock(start - 0.75),
        title: 'Pre-session snack',
        detail:
          longest >= 75
            ? `30–50 g easy carbs, low fat & fiber: banana + toast with honey, or a bagel. Plus 300–500 mL water.`
            : 'Optional: half a banana or a small glass of juice. Coffee is fine.',
        emphasis: true,
      });
    } else {
      tips.push({
        when: clock(start - 3.5),
        title: trainingTime === 'midday' ? 'Breakfast' : 'Lunch (main pre-training meal)',
        detail: `Carb-focused meal ~${preCarbs} g carbs (rice, pasta, potatoes, bread) + ~${pMeal} g protein. Keep fat & fiber moderate.`,
        emphasis: true,
      });
      tips.push({
        when: clock(start - 0.75),
        title: 'Top-up snack',
        detail: longest >= 60 ? '25–40 g carbs: banana, granola bar, rice cake with jam.' : 'Optional small snack if hungry.',
      });
    }
    tips.push({ when: clock(start), title: 'During training', detail: fuelingDuring(longest), emphasis: longest >= 75 });
    tips.push({
      when: clock(end + 0.5),
      title: trainingTime === 'evening' ? 'Dinner = recovery meal' : 'Recovery (within ~1 h)',
      detail: `~${Math.round(0.3 * kg)} g protein + ~${Math.round(1 * kg)} g carbs. Chocolate milk, a Greek yogurt bowl with fruit & granola, or a real meal.`,
      emphasis: true,
    });
    if (trainingTime === 'morning') {
      tips.push({ when: '12:30 PM', title: 'Lunch', detail: `~${pMeal} g protein + carbs + vegetables.` });
      tips.push({ when: '3:30 PM', title: 'Snack', detail: 'Fruit + yogurt or a PB sandwich (cheap, effective).' });
      tips.push({ when: '7:00 PM', title: 'Dinner', detail: `~${pMeal} g protein + carbs + veg.` });
    } else if (trainingTime === 'midday') {
      tips.push({ when: '7:00 PM', title: 'Dinner', detail: `~${pMeal} g protein + carbs + veg.` });
    }
    tips.push({ when: '9:30 PM', title: 'Before bed', detail: '~30–40 g slow protein (Greek yogurt, cottage cheese, casein).' });
  }

  if (tomorrowLongestMinutes >= 150) {
    tips.push({
      when: 'Tonight',
      title: 'Big day tomorrow',
      detail: 'Make dinner carb-rich (pasta, rice, potatoes, about 2 g/kg) and keep it familiar. Lay out your bottles, gels and kit tonight.',
      emphasis: true,
    });
  }
  // Keep in chronological-ish order; "Tonight" goes last.
  return tips;
}

/** Macro split per meal for display. */
export function macroKcal(proteinG: number, carbsG: number, fatG: number): number {
  return Math.round(proteinG * 4 + carbsG * 4 + fatG * 9);
}

export const LB_PER_KG = 2.20462;
export const CM_PER_IN = 2.54;
