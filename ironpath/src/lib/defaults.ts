import { addDays, mondayOnOrAfter, todayLocal } from './dates';
import type { Markers, PlanSettings, Profile } from './types';

/** Pre-filled from what you told me: 5'8", 156 lb, soccer player who lifts. */
export function defaultProfile(): Profile {
  return {
    name: '',
    age: 20,
    sex: 'male',
    heightCm: 172.7, // 5'8"
    weightKg: 70.8, // 156 lb
    units: 'imperial',
    levels: { swim: 'weak', bike: 'decent', run: 'okay' },
    lifestyle: 'onFeet',
    playsSoccer: true,
    lifts: true,
  };
}

export function defaultPlanSettings(today = todayLocal()): PlanSettings {
  const start = mondayOnOrAfter(addDays(today, 1));
  // ~1 year out: the Sunday 52 weeks after the start Monday.
  const raceDate = addDays(start, 52 * 7 - 1);
  return {
    startDate: start,
    raceDate,
    raceName: 'IRONMAN',
    // Mon rest · short weekday sessions (Tue/Thu allow a double: swim AM, run PM)
    // · long weekend days.
    // Early weeks use far less than this. It's a ceiling, not a target.
    availability: [0, 90, 60, 90, 60, 330, 180],
    longRideDay: 5,
    soccerDays: [],
    soccerMinutes: 90,
    strengthPerWeek: 2,
    includeTuneUpRace: true,
    include703: true,
    trainingTime: 'evening',
    busyWeeks: [],
  };
}

export function defaultMarkers(): Markers {
  return {};
}
