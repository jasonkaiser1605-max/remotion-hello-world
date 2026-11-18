import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { defaultProfile } from './defaults';
import { loadSeries, rampRate, workoutLoad } from './load';
import { bmr, dailyTargets, dayLoadFor, hydrationTargetMl, mealTimeline, sweatRate } from './nutrition';
import { computeReadiness, sumSleepHours } from './readiness';
import { cssFromTest, estimateMaxHr, heartRateZones, zoneForHr } from './zones';

const profile = defaultProfile();

describe('zones', () => {
  it('estimates max HR with Tanaka', () => {
    assert.equal(estimateMaxHr(20), 194);
  });
  it('builds 5 ascending, non-overlapping HR zones', () => {
    for (const m of [{}, { lthr: 172 }, { maxHr: 200, restingHr: 52 }]) {
      const z = heartRateZones(20, m);
      assert.equal(z.length, 5);
      for (let i = 1; i < 5; i++) assert.ok(z[i].low > z[i - 1].high - 1 && z[i].low > z[i - 1].low);
    }
  });
  it('maps HR into zones', () => {
    const z = heartRateZones(20, { lthr: 170 });
    assert.equal(zoneForHr(140, z), 1);
    assert.equal(zoneForHr(150, z), 2);
    assert.equal(zoneForHr(175, z), 5);
  });
  it('computes CSS', () => {
    // 400 in 8:00, 200 in 3:50 → 200 m in 250 s → 125 s/100 m
    assert.equal(cssFromTest(480, 230), 125);
    assert.throws(() => cssFromTest(200, 230));
  });
});

describe('nutrition', () => {
  it('BMR matches Mifflin–St Jeor for 5\'8" 156 lb 20 y male', () => {
    // 10*70.8 + 6.25*172.7 - 5*20 + 5 = 1692.4
    assert.equal(bmr(profile), 1692);
  });

  it('classifies training days', () => {
    assert.equal(dayLoadFor(0, 0), 'rest');
    assert.equal(dayLoadFor(40, 40), 'light');
    assert.equal(dayLoadFor(75, 45), 'moderate');
    assert.equal(dayLoadFor(120, 90), 'high');
    assert.equal(dayLoadFor(300, 300), 'veryHigh');
  });

  it('scales carbs with training load and keeps protein steady', () => {
    const rest = dailyTargets(profile, []);
    const big = dailyTargets(profile, [{ sport: 'bike', zone: 2, minutes: 300 }]);
    assert.equal(rest.proteinG, big.proteinG);
    assert.ok(big.carbsG > rest.carbsG * 2);
    assert.ok(big.kcal > rest.kcal + 1500);
    assert.ok(rest.fatG >= Math.round(0.8 * profile.weightKg));
  });

  it('prefers measured kcal from Apple Health over estimates', () => {
    const t = dailyTargets(profile, [{ sport: 'run', zone: 2, minutes: 60, kcal: 777 }]);
    assert.equal(t.exerciseKcal, 777);
  });

  it('never cuts calories on a hard day when leaning out', () => {
    const perform = dailyTargets(profile, [{ sport: 'bike', zone: 2, minutes: 180 }], { goal: 'perform' });
    const lean = dailyTargets(profile, [{ sport: 'bike', zone: 2, minutes: 180 }], { goal: 'lean' });
    assert.ok(lean.kcal >= perform.kcal - 50);
  });

  it('hydration rises with training', () => {
    assert.equal(hydrationTargetMl(70.8, 0), 2500);
    assert.ok(hydrationTargetMl(70.8, 120) > 3500);
  });

  it('sweat rate test', () => {
    assert.equal(sweatRate(71.0, 70.2, 500, 60), 1300);
  });

  it('meal timeline includes during-fuel and recovery for long days', () => {
    const tips = mealTimeline(profile, [{ sport: 'bike', zone: 2, minutes: 240 }], 'morning', 150);
    const titles = tips.map((t) => t.title);
    assert.ok(titles.includes('During training'));
    assert.ok(titles.includes('Recovery (within ~1 h)'));
    assert.ok(titles.includes('Big day tomorrow'));
    assert.match(tips.find((t) => t.title === 'During training')!.detail, /60–90 g/);
  });
});

describe('readiness', () => {
  const history = Array.from({ length: 30 }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    hrvMs: 70,
    restingHr: 52,
    sleepHours: 8,
  }));

  it('green when everything is at baseline', () => {
    const r = computeReadiness({ today: { date: 'x', hrvMs: 72, restingHr: 51, sleepHours: 8.2 }, history, tsb: -5 });
    assert.equal(r.level, 'green');
    assert.ok(r.score! >= 80);
  });

  it('red after a bad night, suppressed HRV and elevated RHR', () => {
    const r = computeReadiness({
      today: { date: 'x', hrvMs: 50, restingHr: 60, sleepHours: 4.5 },
      history,
      tsb: -30,
      checkIn: { date: 'x', energy: 1, soreness: 5, stress: 5, motivation: 2 },
    });
    assert.equal(r.level, 'red');
  });

  it('unknown without data', () => {
    const r = computeReadiness({ today: { date: 'x' }, history: [] });
    assert.equal(r.level, 'unknown');
    assert.equal(r.score, null);
  });

  it('a single red flag caps the day at yellow', () => {
    const r = computeReadiness({ today: { date: 'x', hrvMs: 75, restingHr: 50, sleepHours: 3.5 }, history, tsb: 5 });
    assert.notEqual(r.level, 'green');
  });

  it('merges overlapping sleep from two devices', () => {
    const d = (h: number) => new Date(Date.UTC(2026, 10, 18, h));
    const hours = sumSleepHours(
      [
        { value: 3, startDate: d(0), endDate: d(4) },
        { value: 3, startDate: d(2), endDate: d(6) }, // overlaps
        { value: 2, startDate: d(6), endDate: d(7) }, // awake: excluded
      ],
      [1, 3, 4, 5],
    );
    assert.equal(hours, 6);
  });
});

describe('training load', () => {
  it('one hour at threshold HR ≈ 100', () => {
    const l = workoutLoad({ id: '1', sport: 'run', start: '2026-11-01T10:00:00Z', minutes: 60, avgHr: 170, source: 'x' }, 170);
    assert.equal(l, 100);
  });
  it('fitness builds with consistent training and ramp rate is positive', () => {
    const workouts = Array.from({ length: 40 }, (_, i) => ({
      id: String(i),
      sport: 'bike' as const,
      start: new Date(Date.UTC(2026, 9, 1 + i, 15)).toISOString(),
      minutes: 60,
      source: 'x',
    }));
    const s = loadSeries(workouts, 170, '2026-11-09', 40);
    assert.ok(s.at(-1)!.ctl > 15);
    assert.ok(rampRate(s) > 0);
  });
});
