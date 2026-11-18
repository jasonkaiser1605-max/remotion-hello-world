import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { addDays, weekdayOf } from './dates';
import { defaultPlanSettings, defaultProfile } from './defaults';
import { generatePlan, phaseLayout, sportBreakdown, totalWeeks } from './plan';

const TODAY = '2026-11-18';
const profile = defaultProfile();
const settings = defaultPlanSettings(TODAY);

describe('plan layout', () => {
  it('starts next Monday and spans 52 weeks to race day', () => {
    assert.equal(settings.startDate, '2026-11-23');
    assert.equal(weekdayOf(settings.startDate), 0);
    assert.equal(settings.raceDate, '2027-11-21');
    assert.equal(weekdayOf(settings.raceDate), 6);
    assert.equal(totalWeeks(settings), 52);
  });

  it('orders phases foundation → base → build → peak → taper → race with no gaps', () => {
    const blocks = phaseLayout(52);
    assert.deepEqual(
      blocks.map((b) => b.phase),
      ['foundation', 'base', 'build', 'peak', 'taper', 'race'],
    );
    assert.equal(blocks[0].start, 1);
    assert.equal(blocks.at(-1)!.end, 52);
    for (let i = 1; i < blocks.length; i++) assert.equal(blocks[i].start, blocks[i - 1].end + 1);
  });

  it('handles short plans', () => {
    assert.deepEqual(
      phaseLayout(4).map((b) => b.phase),
      ['taper', 'race'],
    );
    const s = { ...settings, raceDate: addDays(settings.startDate, 7 * 20 - 1) };
    const plan = generatePlan(profile, s);
    assert.equal(plan.length, 20);
    assert.equal(plan.at(-1)!.phase, 'race');
  });
});

describe('generated plan', () => {
  const plan = generatePlan(profile, settings);

  it('puts the race on race day', () => {
    const last = plan.at(-1)!;
    const race = last.sessions.find((s) => s.sport === 'race');
    assert.ok(race);
    assert.equal(race.date, settings.raceDate);
  });

  it('never schedules on a zero-availability day except fixed events', () => {
    for (const w of plan) {
      for (const s of w.sessions) {
        if (s.sport === 'race' || w.phase === 'race') continue;
        assert.notEqual(settings.availability[s.weekday], 0, `${s.id} on ${s.date}`);
      }
    }
  });

  it('never exceeds daily availability (outside race weeks)', () => {
    for (const w of plan) {
      if (w.phase === 'race' || w.raceLabel) continue;
      const perDay = new Map<number, number>();
      for (const s of w.sessions) perDay.set(s.weekday, (perDay.get(s.weekday) ?? 0) + s.minutes);
      for (const [d, m] of perDay) assert.ok(m <= settings.availability[d], `week ${w.week} day ${d}: ${m}`);
    }
  });

  it('swims 3× a week in foundation for a weak swimmer', () => {
    for (const w of plan.filter((x) => x.phase === 'foundation')) {
      assert.equal(w.sessions.filter((s) => s.sport === 'swim').length, 3, `week ${w.week}`);
    }
  });

  it('recovery weeks are lighter than the week before', () => {
    for (const w of plan) {
      if (!w.isRecovery || w.raceLabel || w.week === 1) continue;
      const prev = plan[w.week - 2];
      if (prev.isRecovery || prev.raceLabel) continue;
      assert.ok(w.plannedMinutes < prev.plannedMinutes * 0.85, `week ${w.week}`);
    }
  });

  it('builds volume: peak weeks are much bigger than foundation weeks', () => {
    const avg = (phase: string) => {
      const ws = plan.filter((w) => w.phase === phase && !w.isRecovery);
      return ws.reduce((s, w) => s + w.plannedMinutes, 0) / ws.length;
    };
    assert.ok(avg('peak') > avg('foundation') * 1.6);
    assert.ok(avg('foundation') >= 300 && avg('foundation') <= 480, `foundation avg ${avg('foundation')}`);
  });

  it('long ride lands on the long-ride day and peaks at 5+ h', () => {
    const rides = plan.flatMap((w) => w.sessions.filter((s) => s.kind === 'bike-long'));
    assert.ok(rides.every((r) => r.weekday === settings.longRideDay));
    assert.ok(Math.max(...rides.map((r) => r.minutes)) >= 300);
  });

  it('does not nag about time in the default schedule outside peak', () => {
    const nagged = plan.filter((w) => w.phase !== 'peak' && w.warnings.some((x) => x.includes('short of')));
    assert.deepEqual(nagged.map((w) => w.week), []);
  });

  it('keeps at least 3 runs a week (incl. brick) in build and peak', () => {
    for (const w of plan.filter((x) => (x.phase === 'build' || x.phase === 'peak') && !x.isRecovery && !x.raceLabel)) {
      assert.ok(w.sessions.filter((s) => s.sport === 'run').length >= 3, `week ${w.week}`);
    }
  });

  it('caps the long run at 2.5 h', () => {
    const runs = plan.flatMap((w) => w.sessions.filter((s) => s.kind === 'run-long'));
    assert.ok(Math.max(...runs.map((r) => r.minutes)) <= 150);
  });

  it('includes a tune-up race and a 70.3', () => {
    const labels = plan.map((w) => w.raceLabel).filter(Boolean);
    assert.ok(labels.some((l) => /Sprint|Olympic/.test(l!)));
    assert.ok(labels.some((l) => /70\.3/.test(l!)));
  });

  it('starts with fitness tests', () => {
    const kinds = [...plan[0].sessions, ...plan[1].sessions].map((s) => s.kind);
    assert.ok(kinds.includes('swim-test'));
    assert.ok(kinds.includes('run-test'));
    assert.ok(kinds.includes('bike-test'));
  });

  it('never stacks two hard sessions on one day', () => {
    const hard = new Set(['bike-quality', 'run-quality', 'soccer', 'swim-test', 'bike-test', 'run-test']);
    for (const w of plan) {
      if (w.isRecovery || w.phase === 'taper' || w.phase === 'race') continue;
      const perDay = new Map<number, number>();
      for (const s of w.sessions) if (hard.has(s.kind)) perDay.set(s.weekday, (perDay.get(s.weekday) ?? 0) + 1);
      for (const [d, c] of perDay) assert.ok(c <= 1, `week ${w.week} day ${d}`);
    }
  });

  it('has stable ids so completion survives regeneration', () => {
    const again = generatePlan(profile, settings);
    assert.deepEqual(
      again.flatMap((w) => w.sessions.map((s) => s.id)),
      plan.flatMap((w) => w.sessions.map((s) => s.id)),
    );
  });

  it('every session has steps and a title', () => {
    for (const w of plan) for (const s of w.sessions) {
      assert.ok(s.title.length > 0);
      assert.ok(s.steps.length > 0, s.id);
    }
  });
});

describe('time-constrained & soccer weeks', () => {
  it('busy weeks cut volume', () => {
    const normal = generatePlan(profile, settings);
    const busy = generatePlan(profile, { ...settings, busyWeeks: [6] });
    assert.ok(busy[5].plannedMinutes < normal[5].plannedMinutes * 0.75);
    assert.ok(busy[5].isBusy);
  });

  it('respects a very tight schedule and warns about it', () => {
    const tight = { ...settings, availability: [0, 45, 45, 45, 0, 120, 90] };
    const plan = generatePlan(profile, tight);
    const peak = plan.filter((w) => w.phase === 'peak');
    assert.ok(peak.some((w) => w.warnings.length > 0));
    for (const w of plan) {
      if (w.phase === 'race' || w.raceLabel) continue;
      for (const s of w.sessions) assert.ok(s.minutes <= tight.availability[s.weekday]);
    }
  });

  it('soccer days get a soccer session and no extra run intervals when playing 2×/week', () => {
    const plan = generatePlan(profile, { ...settings, soccerDays: [1, 3] });
    const w = plan[14];
    assert.equal(w.sessions.filter((s) => s.sport === 'soccer').length, 2);
    assert.equal(w.sessions.filter((s) => s.kind === 'run-quality').length, 0);
  });

  it('moving a session keeps its id and changes the date', () => {
    const base = generatePlan(profile, settings);
    const s = base[3].sessions.find((x) => x.sport === 'swim')!;
    const moved = generatePlan(profile, settings, {}, { moves: { [s.id]: 6 } });
    const m = moved[3].sessions.find((x) => x.id === s.id)!;
    assert.equal(m.weekday, 6);
    assert.equal(m.date, addDays(base[3].startDate, 6));
  });

  it('weekly sport breakdown adds up', () => {
    const w = generatePlan(profile, settings)[20];
    const b = sportBreakdown(w);
    const raceMinutes = w.sessions.filter((s) => s.sport === 'race').reduce((a, s) => a + s.minutes, 0);
    assert.equal(b.swim + b.bike + b.run + b.other + raceMinutes, w.plannedMinutes);
  });
});
