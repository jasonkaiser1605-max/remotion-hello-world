import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Field, H1, H2, Icon, Pill, Row, Screen, SportBadge, Stat, T } from '@/components/ui';
import { useToday } from '@/hooks/useDay';
import { formatDistance, formatMinutes, formatPace, prettyDate, WEEKDAY_SHORT } from '@/lib/dates';
import { sessionStatus } from '@/lib/match';
import { fuelingDuring } from '@/lib/nutrition';
import type { PlannedSession, Weekday } from '@/lib/types';
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
  const removeWorkout = useApp((s) => s.removeWorkout);
  const imperial = useApp((s) => s.profile.units === 'imperial');
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
                  value={formatDistance(actual.distanceM, actual.sport, imperial).split(' ')[0]}
                  unit={formatDistance(actual.distanceM, actual.sport, imperial).split(' ')[1]}
                />
              ) : null}
            </Row>
            <Row>
              {actual.avgHr ? <Stat label="Avg HR" value={`${actual.avgHr}`} unit="bpm" /> : null}
              {actual.maxHr ? <Stat label="Max HR" value={`${actual.maxHr}`} unit="bpm" /> : null}
              {actual.kcal ? <Stat label="Calories" value={`${actual.kcal}`} unit="kcal" /> : null}
            </Row>
            {actual.id.startsWith('manual-') ? (
              <Button small kind="ghost" icon="delete-outline" title="Delete this entry" onPress={() => removeWorkout(actual.id)} />
            ) : null}
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

      {!actual && session.sport !== 'race' && session.date <= today ? <LogWorkout session={session} /> : null}

      <H2>Update</H2>
      <Row>
        {marks[session.id] ? (
          <Button
            title={marks[session.id].status === 'done' ? 'Undo “done”' : 'Undo skip'}
            kind="secondary"
            icon="undo"
            onPress={() => markSession(session.id, null)}
            style={{ flex: 1 }}
          />
        ) : actual ? null : (
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

/** Type in what your watch recorded (website version, or any workout Apple Health missed). */
function LogWorkout({ session }: { session: PlannedSession }) {
  const addWorkout = useApp((s) => s.addWorkout);
  const imperial = useApp((s) => s.profile.units === 'imperial');
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ minutes: String(session.minutes), distance: '', hr: '', kcal: '' });
  const num = (v: string) => {
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const swim = session.sport === 'swim';
  const distLabel = swim ? (imperial ? 'yards' : 'metres') : imperial ? 'miles' : 'km';
  const toMetres = (d: number) => (swim ? (imperial ? d * 0.9144 : d) : imperial ? d * 1609.344 : d * 1000);
  if (!open) {
    return (
      <Button
        kind="secondary"
        icon="watch"
        title="Log what your watch recorded"
        onPress={() => setOpen(true)}
      />
    );
  }
  return (
    <Card>
      <T small bold>
        Log this workout
      </T>
      <T small muted>
        Copy the numbers from your Garmin or Apple Watch summary. Heart rate and calories make your fuel targets and
        training load more accurate.
      </T>
      <Row>
        <View style={{ flex: 1 }}>
          <Field label="Minutes" value={f.minutes} onChangeText={(minutes) => setF({ ...f, minutes })} keyboardType="numeric" />
        </View>
        {session.sport === 'swim' || session.sport === 'bike' || session.sport === 'run' ? (
          <View style={{ flex: 1 }}>
            <Field label={`Distance (${distLabel})`} value={f.distance} onChangeText={(distance) => setF({ ...f, distance })} keyboardType="decimal-pad" />
          </View>
        ) : null}
      </Row>
      <Row>
        <View style={{ flex: 1 }}>
          <Field label="Avg heart rate" value={f.hr} onChangeText={(hr) => setF({ ...f, hr })} keyboardType="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Calories" value={f.kcal} onChangeText={(kcal) => setF({ ...f, kcal })} keyboardType="numeric" />
        </View>
      </Row>
      <Button
        title="Save workout"
        icon="check"
        disabled={!num(f.minutes)}
        onPress={() => {
          const d = num(f.distance);
          addWorkout({
            sport: session.sport,
            start: `${session.date}T12:00:00`,
            minutes: Math.round(num(f.minutes) ?? session.minutes),
            distanceM: d ? Math.round(toMetres(d)) : undefined,
            avgHr: num(f.hr) ? Math.round(num(f.hr)!) : undefined,
            kcal: num(f.kcal) ? Math.round(num(f.kcal)!) : undefined,
            source: 'Manual',
          });
          setOpen(false);
        }}
      />
    </Card>
  );
}
