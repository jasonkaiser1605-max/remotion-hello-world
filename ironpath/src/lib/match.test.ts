import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { defaultPlanSettings, defaultProfile } from './defaults';
import { compliance, matchWorkouts, sessionStatus } from './match';
import { generatePlan } from './plan';
import type { CompletedWorkout } from './types';

const plan = generatePlan(defaultProfile(), defaultPlanSettings('2026-11-18'));
const week = plan[2].sessions; // a normal foundation week
const swim = week.find((s) => s.sport === 'swim')!;
const ride = week.find((s) => s.kind === 'bike-long')!;

const w = (id: string, sport: CompletedWorkout['sport'], date: string, minutes: number): CompletedWorkout => ({
  id,
  sport,
  start: `${date}T12:00:00`,
  minutes,
  source: 'Connect',
});

describe('matching Garmin / Apple Watch workouts to the plan', () => {
  it('matches same-day same-sport workouts', () => {
    const m = matchWorkouts(week, [w('a', 'swim', swim.date, 31), w('b', 'bike', ride.date, 70)]);
    assert.equal(m.get(swim.id)?.id, 'a');
    assert.equal(m.get(ride.id)?.id, 'b');
  });

  it('ignores other sports and other days', () => {
    const m = matchWorkouts(week, [w('a', 'run', swim.date, 30), w('b', 'swim', '2020-01-01', 30)]);
    assert.equal(m.get(swim.id), undefined);
  });

  it('uses each workout once', () => {
    const m = matchWorkouts(week, [w('a', 'swim', swim.date, 30)]);
    const swimsThatDay = week.filter((s) => s.sport === 'swim' && s.date === swim.date);
    const matched = swimsThatDay.filter((s) => m.has(s.id));
    assert.equal(matched.length, 1);
  });

  it('status and compliance', () => {
    const m = matchWorkouts(week, [w('a', 'swim', swim.date, 30)]);
    assert.equal(sessionStatus(swim, '2030-01-01', m, {}), 'done');
    assert.equal(sessionStatus(ride, '2030-01-01', m, {}), 'missed');
    assert.equal(sessionStatus(ride, '2000-01-01', m, {}), 'upcoming');
    assert.equal(sessionStatus(ride, ride.date, m, {}), 'today');
    assert.equal(sessionStatus(ride, '2030-01-01', m, { [ride.id]: { status: 'skipped', at: '' } }), 'skipped');
    const c = compliance(week, '2030-01-01', m, {})!;
    assert.ok(c > 0 && c < 100);
  });
});
