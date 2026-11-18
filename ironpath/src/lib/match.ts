import { localDateOf } from './dates';
import type { CompletedWorkout, PlannedSession } from './types';

export type SessionStatus = 'done' | 'skipped' | 'missed' | 'today' | 'upcoming';

export interface ManualMark {
  status: 'done' | 'skipped';
  at: string;
}

/**
 * Link planned sessions to workouts recorded by Apple Watch / Garmin (via Apple Health).
 * Same local day + same sport; key sessions and longer sessions claim first, and each
 * workout is used once, picking the one closest in duration.
 */
export function matchWorkouts(
  sessions: PlannedSession[],
  workouts: CompletedWorkout[],
): Map<string, CompletedWorkout> {
  const byDate = new Map<string, CompletedWorkout[]>();
  for (const w of workouts) {
    const d = localDateOf(w.start);
    byDate.set(d, [...(byDate.get(d) ?? []), w]);
  }
  const used = new Set<string>();
  const out = new Map<string, CompletedWorkout>();
  const ordered = [...sessions].sort(
    (a, b) => Number(b.key) - Number(a.key) || b.minutes - a.minutes,
  );
  for (const s of ordered) {
    const candidates = (byDate.get(s.date) ?? []).filter(
      (w) => !used.has(w.id) && (w.sport === s.sport || (s.sport === 'race' && w.sport !== 'strength')),
    );
    if (candidates.length === 0) continue;
    candidates.sort((a, b) => Math.abs(a.minutes - s.minutes) - Math.abs(b.minutes - s.minutes));
    out.set(s.id, candidates[0]);
    used.add(candidates[0].id);
  }
  return out;
}

export function sessionStatus(
  s: PlannedSession,
  today: string,
  matched: Map<string, CompletedWorkout>,
  marks: Record<string, ManualMark>,
): SessionStatus {
  const mark = marks[s.id];
  if (mark?.status === 'skipped') return 'skipped';
  if (mark?.status === 'done' || matched.has(s.id)) return 'done';
  if (s.date < today) return 'missed';
  if (s.date === today) return 'today';
  return 'upcoming';
}

/** Share of planned (non-race) minutes completed up to and including today. */
export function compliance(
  sessions: PlannedSession[],
  today: string,
  matched: Map<string, CompletedWorkout>,
  marks: Record<string, ManualMark>,
): number | null {
  const due = sessions.filter((s) => s.date <= today && s.sport !== 'race');
  const planned = due.reduce((a, s) => a + s.minutes, 0);
  if (planned === 0) return null;
  const done = due
    .filter((s) => sessionStatus(s, today, matched, marks) === 'done')
    .reduce((a, s) => a + s.minutes, 0);
  return Math.round((done / planned) * 100);
}
