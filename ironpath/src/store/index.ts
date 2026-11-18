import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { addDays, mondayOnOrBefore, todayLocal } from '@/lib/dates';
import { defaultMarkers, defaultPlanSettings, defaultProfile } from '@/lib/defaults';
import { demoData } from '@/lib/demo';
import { matchWorkouts, type ManualMark } from '@/lib/match';
import type { NutritionGoal } from '@/lib/nutrition';
import { generatePlan } from '@/lib/plan';
import type {
  CheckIn,
  CompletedWorkout,
  DailyHealth,
  FoodEntry,
  Markers,
  PlanSettings,
  Profile,
  WaterEntry,
  Weekday,
} from '@/lib/types';
import { connectHealth, fetchDailyHealth, fetchWorkouts, healthSupported, saveFood, saveWater } from '@/services/health';

export interface AppState {
  onboarded: boolean;
  profile: Profile;
  settings: PlanSettings;
  markers: Markers;
  nutritionGoal: NutritionGoal;
  sleepGoalHours: number;
  saveToHealth: boolean;
  healthConnected: boolean;
  lastSync?: string;

  marks: Record<string, ManualMark>;
  moves: Record<string, Weekday>;
  workouts: CompletedWorkout[];
  daily: Record<string, DailyHealth>;
  checkIns: Record<string, CheckIn>;
  food: FoodEntry[];
  water: WaterEntry[];

  // actions
  completeOnboarding: () => void;
  updateProfile: (p: Partial<Profile>) => void;
  updateSettings: (s: Partial<PlanSettings>) => void;
  updateMarkers: (m: Partial<Markers>) => void;
  set: (patch: Partial<AppState>) => void;
  markSession: (id: string, status: 'done' | 'skipped' | null) => void;
  moveSession: (id: string, weekday: Weekday | null) => void;
  toggleBusyWeek: (week: number) => void;
  saveCheckIn: (c: CheckIn) => void;
  addWorkout: (w: Omit<CompletedWorkout, 'id'>) => void;
  removeWorkout: (id: string) => void;
  addFood: (f: Omit<FoodEntry, 'id'>) => void;
  removeFood: (id: string) => void;
  addWater: (ml: number) => void;
  undoWater: (date: string) => void;
  connectAndSync: () => Promise<{ ok: boolean; message: string }>;
  sync: () => Promise<{ ok: boolean; message: string }>;
  loadDemo: () => void;
  resetAll: () => void;
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const initial = () => ({
  onboarded: false,
  profile: defaultProfile(),
  settings: defaultPlanSettings(),
  markers: defaultMarkers(),
  nutritionGoal: 'perform' as NutritionGoal,
  sleepGoalHours: 8,
  saveToHealth: true,
  healthConnected: false,
  lastSync: undefined,
  marks: {},
  moves: {},
  workouts: [],
  daily: {},
  checkIns: {},
  food: [],
  water: [],
});

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial(),

      completeOnboarding: () => set({ onboarded: true }),
      updateProfile: (p) => set({ profile: { ...get().profile, ...p } }),
      updateSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      updateMarkers: (m) => set({ markers: { ...get().markers, ...m } }),
      set: (patch) => set(patch),

      markSession: (id, status) => {
        const marks = { ...get().marks };
        if (status) marks[id] = { status, at: new Date().toISOString() };
        else delete marks[id];
        set({ marks });
      },
      moveSession: (id, weekday) => {
        const moves = { ...get().moves };
        if (weekday === null) delete moves[id];
        else moves[id] = weekday;
        set({ moves });
      },
      toggleBusyWeek: (week) => {
        const busy = new Set(get().settings.busyWeeks);
        if (busy.has(week)) busy.delete(week);
        else busy.add(week);
        set({ settings: { ...get().settings, busyWeeks: [...busy].sort((a, b) => a - b) } });
      },
      saveCheckIn: (c) => set({ checkIns: { ...get().checkIns, [c.date]: c } }),
      addWorkout: (w) => set({ workouts: [...get().workouts, { ...w, id: `manual-${uid()}` }] }),
      removeWorkout: (id) => set({ workouts: get().workouts.filter((w) => w.id !== id) }),

      addFood: (f) => {
        const entry = { ...f, id: uid() };
        set({ food: [...get().food, entry] });
        if (get().saveToHealth && get().healthConnected) void saveFood(entry);
      },
      removeFood: (id) => set({ food: get().food.filter((f) => f.id !== id) }),
      addWater: (ml) => {
        const now = new Date();
        set({ water: [...get().water, { id: uid(), date: todayLocal(now), time: now.toISOString(), ml }] });
        if (get().saveToHealth && get().healthConnected) void saveWater(ml, now);
      },
      undoWater: (date) => {
        const list = get().water;
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i].date === date) {
            set({ water: [...list.slice(0, i), ...list.slice(i + 1)] });
            return;
          }
        }
      },

      connectAndSync: async () => {
        if (!healthSupported()) {
          return {
            ok: false,
            message:
              'Apple Health is only available in the iPhone app build (not in Expo Go or the web preview).',
          };
        }
        const ok = await connectHealth().catch(() => false);
        set({ healthConnected: ok });
        if (!ok) return { ok: false, message: 'Apple Health permission was not granted.' };
        return get().sync();
      },

      sync: async () => {
        if (!healthSupported() || !get().healthConnected) {
          return { ok: false, message: 'Connect Apple Health first (Settings → Apple Health).' };
        }
        try {
          const [workouts, days] = await Promise.all([fetchWorkouts(90), fetchDailyHealth(60)]);
          const daily = { ...get().daily };
          for (const d of days) daily[d.date] = { ...daily[d.date], ...d };
          // Keep manual / older entries that fell out of the query window.
          const fresh = new Set(workouts.map((w) => w.id));
          const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
          const kept = get().workouts.filter((w) => !fresh.has(w.id) && (w.id.startsWith('manual-') || w.start < cutoff));
          set({ workouts: [...kept, ...workouts], daily, lastSync: new Date().toISOString() });
          return { ok: true, message: `Synced ${workouts.length} workouts and ${days.length} days of health data.` };
        } catch (e) {
          return { ok: false, message: e instanceof Error ? e.message : 'Sync failed' };
        }
      },

      loadDemo: () => {
        const today = todayLocal();
        const start = mondayOnOrBefore(addDays(today, -23));
        const settings = { ...get().settings, startDate: start, raceDate: addDays(start, 52 * 7 - 1) };
        const plan = generatePlan(get().profile, settings, get().markers, { moves: get().moves });
        const sessions = plan.flatMap((w) => w.sessions);
        const { daily, workouts } = demoData(today, sessions);
        const dmap: Record<string, DailyHealth> = {};
        for (const d of daily) dmap[d.date] = d;
        const at = (h: number) => {
          const d = new Date();
          d.setHours(h, 0, 0, 0);
          return d.toISOString();
        };
        set({
          settings,
          workouts,
          daily: dmap,
          lastSync: new Date().toISOString(),
          checkIns: { ...get().checkIns, [today]: { date: today, energy: 4, soreness: 2, stress: 3, motivation: 4 } },
          food: [
            { id: uid(), date: today, time: at(7), name: 'Oatmeal, banana & peanut butter', kcal: 520, proteinG: 16, carbsG: 82, fatG: 15, source: 'quick' },
            { id: uid(), date: today, time: at(12), name: 'Chicken burrito bowl', kcal: 760, proteinG: 46, carbsG: 88, fatG: 24, source: 'photo', note: 'Estimated from photo' },
          ],
          water: [
            { id: uid(), date: today, time: at(8), ml: 500 },
            { id: uid(), date: today, time: at(11), ml: 500 },
            { id: uid(), date: today, time: at(14), ml: 250 },
          ],
        });
      },

      resetAll: () => set({ ...initial() }),
    }),
    {
      name: 'ironpath-v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Persist data only, not functions.
      partialize: (s) => ({
        onboarded: s.onboarded,
        profile: s.profile,
        settings: s.settings,
        markers: s.markers,
        nutritionGoal: s.nutritionGoal,
        sleepGoalHours: s.sleepGoalHours,
        saveToHealth: s.saveToHealth,
        healthConnected: s.healthConnected,
        lastSync: s.lastSync,
        marks: s.marks,
        moves: s.moves,
        workouts: s.workouts,
        daily: s.daily,
        checkIns: s.checkIns,
        food: s.food,
        water: s.water,
      }),
    },
  ),
);

/** The training plan, regenerated whenever profile/settings/markers/moves change. */
export function usePlan() {
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);
  const markers = useApp((s) => s.markers);
  const moves = useApp((s) => s.moves);
  return useMemo(() => generatePlan(profile, settings, markers, { moves }), [profile, settings, markers, moves]);
}

/** Planned sessions matched to Apple Health workouts. */
export function useMatches() {
  const plan = usePlan();
  const workouts = useApp((s) => s.workouts);
  return useMemo(() => matchWorkouts(plan.flatMap((w) => w.sessions), workouts), [plan, workouts]);
}
