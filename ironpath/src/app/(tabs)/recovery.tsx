import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Bars, Legend, Sparkline } from '@/components/charts';
import { ReadinessCard } from '@/components/Readiness';
import { Button, Card, H1, H2, Icon, Row, Screen, SportBadge, Stat, T } from '@/components/ui';
import { useLoad, useReadiness, useToday } from '@/hooks/useDay';
import { addDays, formatDistance, formatMinutes, localDateOf, prettyDate, WEEKDAY_SHORT, weekdayOf } from '@/lib/dates';
import { rampRate } from '@/lib/load';
import { useApp } from '@/store';
import { C } from '@/theme';

export default function RecoveryScreen() {
  const today = useToday();
  const readiness = useReadiness(today);
  const daily = useApp((s) => s.daily);
  const workouts = useApp((s) => s.workouts);
  const sleepGoal = useApp((s) => s.sleepGoalHours);
  const healthConnected = useApp((s) => s.healthConnected);
  const lastSync = useApp((s) => s.lastSync);
  const sync = useApp((s) => s.sync);
  const imperial = useApp((s) => s.profile.units === 'imperial');
  const load = useLoad();
  const [syncing, setSyncing] = useState(false);

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const last28 = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27));
  const td = daily[today];
  const recent = [...workouts].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 8);
  const lastPoint = load[load.length - 1];
  const ramp = rampRate(load);
  const l42 = load.slice(-42);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Recovery</H1>
        {healthConnected ? (
          <Button
            small
            kind="ghost"
            icon="sync"
            loading={syncing}
            title={lastSync ? new Date(lastSync).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Sync'}
            onPress={async () => {
              setSyncing(true);
              await sync();
              setSyncing(false);
            }}
          />
        ) : null}
      </Row>

      <ReadinessCard r={readiness} date={today} showComponents />

      <Card>
        <Row>
          <Stat label="Resting HR" value={td?.restingHr ? String(td.restingHr) : '–'} unit="bpm" />
          <Stat label="HRV" value={td?.hrvMs ? String(td.hrvMs) : '–'} unit="ms" />
          <Stat label="VO₂max" value={td?.vo2max ? String(td.vo2max) : '–'} />
        </Row>
        <Row>
          <Stat label="Active today" value={td?.activeKcal ? String(td.activeKcal) : '–'} unit="kcal" />
          <Stat label="Steps" value={td?.steps ? td.steps.toLocaleString() : '–'} />
          <Stat label="Sleep" value={td?.sleepHours ? td.sleepHours.toFixed(1) : '–'} unit="h" />
        </Row>
      </Card>

      <H2>Sleep · last 7 nights</H2>
      <Card>
        <Bars
          values={last7.map((d) => daily[d]?.sleepHours)}
          labels={last7.map((d) => WEEKDAY_SHORT[weekdayOf(d)].slice(0, 2))}
          goal={sleepGoal}
          color={C.blue}
          format={(v) => v.toFixed(1)}
        />
        <T small muted>
          Goal {sleepGoal} h. Faded bars are nights more than 15% short. Deep + REM last night:{' '}
          {td?.sleepDeepHours !== undefined ? `${td.sleepDeepHours.toFixed(1)} h deep · ${(td.sleepRemHours ?? 0).toFixed(1)} h REM` : '–'}
        </T>
      </Card>

      <H2>HRV & resting HR · 28 days</H2>
      <Card>
        <Sparkline series={[last28.map((d) => daily[d]?.hrvMs), last28.map((d) => daily[d]?.restingHr)]} colors={[C.green, C.red]} />
        <Legend
          items={[
            { label: 'HRV (higher = more recovered)', color: C.green },
            { label: 'Resting HR (lower = better)', color: C.red },
          ]}
        />
      </Card>

      <H2>Training load · 6 weeks</H2>
      <Card>
        <Sparkline series={[l42.map((p) => p.ctl), l42.map((p) => p.atl), l42.map((p) => p.tsb)]} colors={[C.blue, C.accent, C.yellow]} height={90} />
        <Legend
          items={[
            { label: 'Fitness', color: C.blue },
            { label: 'Fatigue', color: C.accent },
            { label: 'Form', color: C.yellow },
          ]}
        />
        {lastPoint ? (
          <Row>
            <Stat label="Fitness" value={lastPoint.ctl.toFixed(0)} />
            <Stat label="Fatigue" value={lastPoint.atl.toFixed(0)} />
            <Stat label="Form" value={lastPoint.tsb.toFixed(0)} color={lastPoint.tsb < -25 ? C.red : lastPoint.tsb < -10 ? C.yellow : C.green} />
          </Row>
        ) : null}
        <T small muted>
          {ramp > 7
            ? `⚠️ Fitness is ramping fast (+${ramp}/week). New triathletes do best under ~5–7 per week. Ease off if anything aches.`
            : 'Fitness rises slowly with consistent training. Form dips during hard blocks and rebounds in recovery weeks; that’s the plan working.'}
        </T>
      </Card>

      <H2>Recent workouts</H2>
      {recent.length === 0 ? (
        <Card>
          <T small muted>
            No workouts yet. Once Apple Health is connected, everything from your Garmin and Apple Watch shows up here.
          </T>
          <Button small kind="secondary" title="Connect in Settings" onPress={() => router.push('/settings')} />
        </Card>
      ) : (
        <Card>
          {recent.map((w) => (
            <Row key={w.id} gap={10} style={{ paddingVertical: 4 }}>
              <SportBadge sport={w.sport} size={30} />
              <View style={{ flex: 1 }}>
                <T small bold>
                  {prettyDate(localDateOf(w.start))} · {formatMinutes(w.minutes)}
                  {w.distanceM ? ` · ${formatDistance(w.distanceM, w.sport, imperial)}` : ''}
                </T>
                <T small muted>
                  {w.avgHr ? `${w.avgHr} bpm avg` : 'no HR'}
                  {w.kcal ? ` · ${w.kcal} kcal` : ''} · {w.source}
                </T>
              </View>
              <Icon name="check-circle" size={18} color={C.green} />
            </Row>
          ))}
        </Card>
      )}
    </Screen>
  );
}
