import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, H1, H2, Icon, Pill, Row, Screen, SportBadge, Stat, T } from '@/components/ui';
import { useToday } from '@/hooks/useDay';
import { formatMinutes, formatPace, prettyDate, WEEKDAY_SHORT } from '@/lib/dates';
import { sessionStatus } from '@/lib/match';
import { fuelingDuring } from '@/lib/nutrition';
import type { Weekday } from '@/lib/types';
import { heartRateZones, powerZones, swimPaces } from '@/lib/zones';
import { useApp, useMatches, usePlan } from '@/store';
import { C, SPORT, ZONE_COLORS } from '@/theme';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlan();
  const matches = useMatches();
  const marks = useApp((s) => s.marks);
  const profile = useApp((s) => s.profile);
  const markers = useApp((s) => s.markers);
  const markSession = useApp((s) => s.markSession);
  const moveSession = useApp((s) => s.moveSession);
  const moved = useApp((s) => (id ? s.moves[id] : undefined));
  const today = useToday();

  const session = plan.flatMap((w) => w.sessions).find((s) => s.id === id);
  if (!session) {
    return (
      <Screen edges={['bottom']}>
        <T>Workout not found. It may have moved after a settings change.</T>
      </Screen>
    );
  }
  const status = sessionStatus(session, today, matches, marks);
  const actual = matches.get(session.id);
  const zones = heartRateZones(profile.age, markers);
  const z = zones[session.zone - 1];
  const color = SPORT[session.sport].color;
  const showZone = session.sport === 'swim' || session.sport === 'bike' || session.sport === 'run';

  return (
    <Screen edges={['bottom']}>
      <Row gap={12}>
        <SportBadge sport={session.sport} size={48} />
        <View style={{ flex: 1 }}>
          <T small muted>
            {prettyDate(session.date)} · Week {session.week}
          </T>
          <H1 style={{ fontSize: 24 }}>{session.title}</H1>
        </View>
      </Row>
      <Row style={{ flexWrap: 'wrap' }}>
        {session.key ? <Pill label="Key session" color={C.accent} /> : null}
        {status === 'done' ? <Pill label="Done" color={C.green} /> : null}
        {status === 'skipped' ? <Pill label="Skipped" color={C.faint} /> : null}
        {status === 'missed' ? <Pill label="Missed" color={C.red} /> : null}
      </Row>

      <Card>
        <Row>
          <Stat label="Duration" value={session.sport === 'race' ? 'Race' : formatMinutes(session.minutes)} />
          {session.distanceM && session.sport === 'swim' ? <Stat label="Distance" value={`${session.distanceM}`} unit="m" /> : null}
          {showZone ? <Stat label="Main zone" value={`Z${session.zone}`} color={ZONE_COLORS[session.zone - 1]} /> : null}
        </Row>
        {showZone && z ? (
          <T small muted>
            Zone {z.zone} {z.name}: {z.low}–{z.high} bpm{session.sport === 'bike' ? ' (bike HR runs ~5–10 bpm lower than run HR)' : ''}. {z.feel}
          </T>
        ) : null}
        {session.sport === 'swim' && markers.cssSecPer100 ? (
          <T small muted>
            Your swim paces: easy {formatPace(swimPaces(markers.cssSecPer100).easy)} · steady{' '}
            {formatPace(swimPaces(markers.cssSecPer100).endurance)} · CSS {formatPace(markers.cssSecPer100)} per 100 m
          </T>
        ) : null}
        {session.sport === 'bike' && markers.ftp ? (
          <T small muted>
            Power: Z2 {powerZones(markers.ftp)[1].low}–{powerZones(markers.ftp)[1].high} W · Z3 {powerZones(markers.ftp)[2].low}–
            {powerZones(markers.ftp)[2].high} W · Z4 {powerZones(markers.ftp)[3].low}–{powerZones(markers.ftp)[3].high} W
          </T>
        ) : null}
      </Card>

      <H2>Workout</H2>
      <Card>
        {session.steps.map((s, i) => (
          <Row key={i} gap={12} style={{ alignItems: 'flex-start', paddingVertical: 4 }}>
            <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: s.zone ? ZONE_COLORS[s.zone - 1] : color }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T bold>{s.label}</T>
                <T bold color={color}>
                  {s.amount}
                </T>
              </Row>
              {s.detail ? (
                <T small muted>
                  {s.detail}
                </T>
              ) : null}
            </View>
          </Row>
        ))}
      </Card>

      {session.notes.length > 0 || (session.minutes >= 60 && session.sport !== 'strength' && session.sport !== 'race') ? (
        <>
          <H2>Coach notes</H2>
          <Card>
            {session.notes.map((n) => (
              <Row key={n} style={{ alignItems: 'flex-start' }}>
                <Icon name="chevron-right" size={16} color={C.accent} />
                <T small style={{ flex: 1 }}>
                  {n}
                </T>
              </Row>
            ))}
            {session.minutes >= 60 && !session.notes.some((n) => n.startsWith('Fuel')) && session.sport !== 'strength' && session.sport !== 'race' ? (
              <Row style={{ alignItems: 'flex-start' }}>
                <Icon name="chevron-right" size={16} color={C.accent} />
                <T small style={{ flex: 1 }}>
                  Fuel: {fuelingDuring(session.minutes)}
                </T>
              </Row>
            ) : null}
          </Card>
        </>
      ) : null}

      {actual ? (
        <>
          <H2>Recorded ({actual.source})</H2>
          <Card accent={C.green}>
            <Row>
              <Stat label="Time" value={formatMinutes(actual.minutes)} />
              {actual.distanceM ? (
                <Stat
                  label="Distance"
                  value={actual.sport === 'swim' ? `${Math.round(actual.distanceM)}` : (actual.distanceM / 1000).toFixed(1)}
                  unit={actual.sport === 'swim' ? 'm' : 'km'}
                />
              ) : null}
            </Row>
            <Row>
              {actual.avgHr ? <Stat label="Avg HR" value={`${actual.avgHr}`} unit="bpm" /> : null}
              {actual.maxHr ? <Stat label="Max HR" value={`${actual.maxHr}`} unit="bpm" /> : null}
              {actual.kcal ? <Stat label="Calories" value={`${actual.kcal}`} unit="kcal" /> : null}
            </Row>
            {actual.avgHr && showZone ? (
              <T small muted>
                {actual.avgHr > (z?.high ?? 999) + 5
                  ? 'Average HR was above the target zone. On easy days, slow down to keep it aerobic.'
                  : 'Nice. Heart rate was right where it should be.'}
              </T>
            ) : null}
          </Card>
        </>
      ) : null}

      <H2>Update</H2>
      <Row>
        {status === 'done' || status === 'skipped' ? (
          <Button title="Undo" kind="secondary" icon="undo" onPress={() => markSession(session.id, null)} style={{ flex: 1 }} />
        ) : (
          <>
            <Button title="Mark done" icon="check" onPress={() => markSession(session.id, 'done')} style={{ flex: 1 }} />
            <Button title="Skip" kind="secondary" icon="close" onPress={() => markSession(session.id, 'skipped')} style={{ flex: 1 }} />
          </>
        )}
      </Row>
      <T small muted>
        Workouts recorded on your Garmin or Apple Watch are matched automatically. No need to tap Done.
      </T>
      {session.sport !== 'race' ? (
        <Card>
          <T small bold>
            Move to another day this week
          </T>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {WEEKDAY_SHORT.map((d, i) => (
              <Button
                key={d}
                small
                kind={i === session.weekday ? 'primary' : 'secondary'}
                title={d}
                onPress={() => moveSession(session.id, i as Weekday)}
              />
            ))}
          </Row>
          {moved !== undefined ? (
            <Button small kind="ghost" title="Reset to planned day" onPress={() => moveSession(session.id, null)} />
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}
