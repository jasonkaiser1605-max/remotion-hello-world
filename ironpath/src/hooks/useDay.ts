import { useMemo } from 'react';

import { addDays, todayLocal } from '@/lib/dates';
import { loadSeries } from '@/lib/load';
import { sessionStatus } from '@/lib/match';
import { dailyTargets, type SessionLike } from '@/lib/nutrition';
import { sessionsOn } from '@/lib/plan';
import { computeReadiness } from '@/lib/readiness';
import { effectiveLthr } from '@/lib/zones';
import { useApp, useMatches, usePlan } from '@/store';

export function useToday() {
  // Recomputed on each render; cheap, and keeps "today" correct after midnight.
  return todayLocal();
}

export function useLoad() {
  const workouts = useApp((s) => s.workouts);
  const profile = useApp((s) => s.profile);
  const markers = useApp((s) => s.markers);
  const today = useToday();
  return useMemo(
    () => loadSeries(workouts, effectiveLthr(profile.age, markers), today, 90),
    [workouts, profile.age, markers, today],
  );
}

export function useDayData(date: string) {
  const plan = usePlan();
  const matches = useMatches();
  const marks = useApp((s) => s.marks);
  const profile = useApp((s) => s.profile);
  const markers = useApp((s) => s.markers);
  const goal = useApp((s) => s.nutritionGoal);
  const food = useApp((s) => s.food);
  const water = useApp((s) => s.water);
  const today = useToday();

  return useMemo(() => {
    const sessions = sessionsOn(plan, date).map((s) => ({
      session: s,
      status: sessionStatus(s, today, matches, marks),
      actual: matches.get(s.id),
    }));
    // Use measured kcal for sessions you've completed, the plan for the rest.
    const forTargets: SessionLike[] = sessions
      .filter((x) => x.status !== 'skipped')
      .map((x) => ({
        sport: x.session.sport,
        zone: x.session.zone,
        minutes: x.actual?.minutes ?? x.session.minutes,
        kcal: x.actual?.kcal,
      }));
    const targets = dailyTargets(profile, forTargets, {
      goal,
      sweatRateMlPerHr: markers.sweatRateMlPerHr,
    });
    const meals = food.filter((f) => f.date === date).sort((a, b) => a.time.localeCompare(b.time));
    const eaten = meals.reduce(
      (t, f) => ({
        kcal: t.kcal + f.kcal,
        proteinG: t.proteinG + f.proteinG,
        carbsG: t.carbsG + f.carbsG,
        fatG: t.fatG + f.fatG,
      }),
      { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );
    const waterMl = water.filter((w) => w.date === date).reduce((a, w) => a + w.ml, 0);
    const tomorrow = sessionsOn(plan, addDays(date, 1));
    const tomorrowLongest = tomorrow.reduce((m, s) => Math.max(m, s.sport === 'race' ? 999 : s.minutes), 0);
    return { sessions, targets, meals, eaten, waterMl, tomorrow, tomorrowLongest };
  }, [plan, date, matches, marks, profile, markers, goal, food, water, today]);
}

export function useReadiness(date: string) {
  const daily = useApp((s) => s.daily);
  const checkIns = useApp((s) => s.checkIns);
  const sleepGoalHours = useApp((s) => s.sleepGoalHours);
  const load = useLoad();
  return useMemo(() => {
    const today = daily[date] ?? { date };
    const history = Object.values(daily).filter((d) => d.date < date && d.date >= addDays(date, -60));
    const point = load.find((p) => p.date === date);
    return computeReadiness({
      today,
      history,
      tsb: load.some((p) => p.load > 0) ? point?.tsb : undefined,
      checkIn: checkIns[date],
      sleepGoalHours,
    });
  }, [daily, checkIns, sleepGoalHours, load, date]);
}
