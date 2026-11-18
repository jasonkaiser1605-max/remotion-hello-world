import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { CaloriesCard, WaterCard } from '@/components/Fuel';
import { ReadinessCard } from '@/components/Readiness';
import { SessionCard } from '@/components/SessionCard';
import { Button, Card, H1, H2, Icon, ProgressBar, Row, Screen, T } from '@/components/ui';
import { useDayData, useReadiness, useToday } from '@/hooks/useDay';
import { daysBetween, prettyDate } from '@/lib/dates';
import { DAILY_TIPS } from '@/lib/knowledge';
import { compliance } from '@/lib/match';
import { DAY_LOAD_INFO, mealTimeline } from '@/lib/nutrition';
import { PHASE_INFO, weekForDate } from '@/lib/plan';
import { useApp, useMatches, usePlan } from '@/store';
import { C } from '@/theme';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Today() {
  const today = useToday();
  const plan = usePlan();
  const matches = useMatches();
  const marks = useApp((s) => s.marks);
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);
  const healthConnected = useApp((s) => s.healthConnected);
  const lastSync = useApp((s) => s.lastSync);
  const sync = useApp((s) => s.sync);
  const loadDemo = useApp((s) => s.loadDemo);
  const workoutsCount = useApp((s) => s.workouts.length);
  const day = useDayData(today);
  const readiness = useReadiness(today);
  const [syncing, setSyncing] = useState(false);

  const daysToRace = daysBetween(today, settings.raceDate);
  const started = today >= settings.startDate;
  const weekNo = weekForDate(settings, today);
  const week = plan[weekNo - 1];
  const weekCompliance = week ? compliance(week.sessions, today, matches, marks) : null;
  const tip = DAILY_TIPS[daysBetween('2026-01-01', today) % DAILY_TIPS.length];

  const nextMeal = useMemo(() => {
    const tips = mealTimeline(
      profile,
      day.sessions.filter((x) => x.status !== 'skipped').map((x) => x.session),
      settings.trainingTime,
      day.tomorrowLongest,
    );
    return tips.find((t) => t.emphasis) ?? tips[0];
  }, [profile, day, settings.trainingTime]);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T muted small>
            {prettyDate(today)}
          </T>
          <H1>
            {greeting()}
            {profile.name ? `, ${profile.name}` : ''}
          </H1>
        </View>
        <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
          <Icon name="cog-outline" size={26} color={C.muted} />
        </Pressable>
      </Row>

      {/* Countdown & phase */}
      <Card style={{ backgroundColor: C.accentSoft, borderColor: 'transparent' }}>
        <T small color={C.accent} bold>
          {settings.raceName.toUpperCase()} · {prettyDate(settings.raceDate)}
        </T>
        <T bold style={{ fontSize: 30, lineHeight: 36 }}>
          {daysToRace} days to go
        </T>
        {week ? (
          <Row style={{ justifyContent: 'space-between' }}>
            <T small muted>
              {started ? `Week ${weekNo} of ${plan.length}` : `Plan starts ${prettyDate(settings.startDate)}`}
            </T>
            <T small bold color={PHASE_INFO[week.phase].color}>
              {PHASE_INFO[week.phase].name}
              {week.isRecovery ? ' · Recovery week' : ''}
            </T>
          </Row>
        ) : null}
        <ProgressBar value={started ? weekNo : 0} max={plan.length} color={C.accent} height={6} />
        {weekCompliance !== null && started ? (
          <T small muted>
            This week so far: {weekCompliance}% of planned training done
          </T>
        ) : null}
      </Card>

      <ReadinessCard r={readiness} date={today} />

      <H2>Today’s training</H2>
      {readiness.level === 'red' && day.sessions.some((s) => s.status === 'today') ? (
        <Card accent={C.red}>
          <T small>
            Your body is asking for rest. Consider swapping today’s session for 20–30 min very easy, or mark it skipped.
            Tomorrow’s session matters more than today’s.
          </T>
        </Card>
      ) : null}
      {day.sessions.length === 0 ? (
        <Card>
          <Row>
            <Icon name="sofa-outline" color={C.muted} />
            <T bold>Rest day</T>
          </Row>
          <T small muted>
            Recovery is training. An easy walk, 15 min of mobility, extra sleep. Fitness is built when you rest.
          </T>
        </Card>
      ) : (
        day.sessions.map((x) => <SessionCard key={x.session.id} session={x.session} status={x.status} actual={x.actual} />)
      )}
      {!started ? (
        <Card>
          <T small muted>
            Your plan starts {prettyDate(settings.startDate)}. Until then, swim easy once or twice, keep lifting and
            playing, and get your gear sorted (see Learn → Gear).
          </T>
        </Card>
      ) : null}

      <H2 right={<Button small kind="ghost" title="Log food" icon="camera" onPress={() => router.push('/food/add?mode=photo')} />}>
        Fuel
      </H2>
      <Card accent={C.carbs} style={{ paddingVertical: 10 }}>
        <T small bold>
          {DAY_LOAD_INFO[day.targets.load].label}: ~{day.targets.carbsPerKg} g carbs per kg
        </T>
        <T small muted>
          {DAY_LOAD_INFO[day.targets.load].blurb}
        </T>
      </Card>
      <CaloriesCard targets={day.targets} eaten={day.eaten} />
      <WaterCard date={today} ml={day.waterMl} target={day.targets.waterMl} />
      {nextMeal ? (
        <Card onPress={() => router.push('/fuel')}>
          <Row>
            <Icon name="clock-outline" color={C.carbs} size={18} />
            <T small bold>
              {nextMeal.when} · {nextMeal.title}
            </T>
          </Row>
          <T small muted>
            {nextMeal.detail}
          </T>
        </Card>
      ) : null}

      {!healthConnected && workoutsCount === 0 ? (
        <Card accent={C.blue}>
          <Row>
            <Icon name="watch-variant" color={C.blue} />
            <T bold>Connect Garmin & Apple Watch</T>
          </Row>
          <T small muted>
            Link Apple Health to pull in workouts, heart rate, distance, calories, sleep and HRV automatically. Garmin
            syncs through Apple Health too.
          </T>
          <Button title="Set up in Settings" kind="secondary" onPress={() => router.push('/settings')} />
          {Platform.OS !== 'ios' ? (
            <Button title="Load demo data (preview)" kind="ghost" small onPress={loadDemo} />
          ) : null}
        </Card>
      ) : healthConnected ? (
        <Row style={{ justifyContent: 'center' }}>
          <Button
            small
            kind="ghost"
            icon="sync"
            loading={syncing}
            title={lastSync ? `Synced ${new Date(lastSync).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Sync now'}
            onPress={async () => {
              setSyncing(true);
              await sync();
              setSyncing(false);
            }}
          />
        </Row>
      ) : null}

      <Card>
        <Row>
          <Icon name="lightbulb-on-outline" color={C.yellow} size={18} />
          <T small bold>
            Coach tip
          </T>
        </Row>
        <T small muted>
          {tip}
        </T>
      </Card>
    </Screen>
  );
}
