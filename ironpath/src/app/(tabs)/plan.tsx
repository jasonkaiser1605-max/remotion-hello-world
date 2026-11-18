import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';

import { SessionCard } from '@/components/SessionCard';
import { Button, Card, H1, Icon, Pill, ProgressBar, Row, Screen, T } from '@/components/ui';
import { useToday } from '@/hooks/useDay';
import { addDays, formatMinutes, prettyMonthDay, WEEKDAY_SHORT } from '@/lib/dates';
import { compliance, sessionStatus } from '@/lib/match';
import { PHASE_INFO, phaseLayout, sportBreakdown, weekForDate } from '@/lib/plan';
import { useApp, useMatches, usePlan } from '@/store';
import { C, SPORT } from '@/theme';

export default function PlanScreen() {
  const plan = usePlan();
  const matches = useMatches();
  const marks = useApp((s) => s.marks);
  const settings = useApp((s) => s.settings);
  const toggleBusy = useApp((s) => s.toggleBusyWeek);
  const today = useToday();
  const current = weekForDate(settings, today);
  const [sel, setSel] = useState(current);
  const scroller = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ x: Math.max(0, (sel - 3) * 52), animated: false });
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const week = plan[Math.min(sel, plan.length) - 1];
  if (!week) return <Screen><T>No plan yet.</T></Screen>;
  const blocks = phaseLayout(plan.length);
  const breakdown = sportBreakdown(week);
  const comp = compliance(week.sessions, today, matches, marks);
  const maxBar = Math.max(...plan.map((w) => w.plannedMinutes - (w.phase === 'race' ? 840 : 0)));

  return (
    <Screen>
      <H1>Your season</H1>

      {/* Season timeline */}
      <Card>
        <Row gap={2} style={{ height: 54, alignItems: 'flex-end' }}>
          {plan.map((w) => {
            const minutes = w.raceLabel ? maxBar : w.plannedMinutes;
            const h = Math.max(6, (Math.min(minutes, maxBar) / maxBar) * 50);
            return (
              <Pressable key={w.week} onPress={() => setSel(w.week)} style={{ flex: 1, height: 54, justifyContent: 'flex-end' }}>
                <View
                  style={{
                    height: h,
                    borderRadius: 2,
                    backgroundColor: w.raceLabel ? C.yellow : PHASE_INFO[w.phase].color,
                    opacity: w.week === sel ? 1 : w.week < current ? 0.45 : 0.75,
                    borderWidth: w.week === current ? 1 : 0,
                    borderColor: '#fff',
                  }}
                />
              </Pressable>
            );
          })}
        </Row>
        <Row style={{ flexWrap: 'wrap' }} gap={10}>
          {blocks.map((b) => (
            <Row key={b.phase} gap={4}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PHASE_INFO[b.phase].color }} />
              <T small muted>
                {PHASE_INFO[b.phase].name} {b.start === b.end ? `W${b.start}` : `W${b.start}–${b.end}`}
              </T>
            </Row>
          ))}
        </Row>
      </Card>

      {/* Week selector */}
      <ScrollView ref={scroller} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {plan.map((w) => {
          const active = w.week === sel;
          return (
            <Pressable
              key={w.week}
              onPress={() => setSel(w.week)}
              style={{
                width: 46,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: active ? PHASE_INFO[w.phase].color : C.card,
                borderWidth: w.week === current ? 1.5 : 0,
                borderColor: C.accent,
              }}
            >
              <Text style={{ color: active ? C.bg : C.muted, fontSize: 11, fontWeight: '700' }}>W{w.week}</Text>
              <Text style={{ color: active ? C.bg : C.text, fontSize: 12, fontWeight: '800' }}>
                {w.raceLabel ? '🏁' : w.isBusy ? '📚' : w.isRecovery ? 'R' : `${Math.round(w.plannedMinutes / 60)}h`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Week header */}
      <Card accent={PHASE_INFO[week.phase].color}>
        <T bold style={{ fontSize: 17 }}>
          Week {week.week} · {prettyMonthDay(week.startDate)}–{prettyMonthDay(addDays(week.startDate, 6))}
        </T>
        <Row style={{ flexWrap: 'wrap' }}>
          <Pill label={PHASE_INFO[week.phase].name} color={PHASE_INFO[week.phase].color} />
          {week.isRecovery ? <Pill label="Recovery week" color={C.green} /> : null}
          {week.isBusy ? <Pill label="Busy week" color={C.blue} /> : null}
          {week.raceLabel ? <Pill label={week.raceLabel} color={C.yellow} /> : null}
          {week.week === current ? <Pill label="This week" color={C.accent} /> : null}
        </Row>
        <T small muted>
          {week.focus}
        </T>
        <Row gap={14} style={{ marginTop: 4 }}>
          {(['swim', 'bike', 'run'] as const).map((s) => (
            <View key={s} style={{ flex: 1, gap: 3 }}>
              <Row gap={4}>
                <Icon name={SPORT[s].icon} size={14} color={SPORT[s].color} />
                <T small bold>
                  {formatMinutes(breakdown[s])}
                </T>
              </Row>
              <ProgressBar value={breakdown[s]} max={week.plannedMinutes || 1} color={SPORT[s].color} height={5} />
            </View>
          ))}
          <View style={{ flex: 1, gap: 3 }}>
            <Row gap={4}>
              <Icon name="dumbbell" size={14} color={SPORT.strength.color} />
              <T small bold>
                {formatMinutes(breakdown.other)}
              </T>
            </Row>
            <ProgressBar value={breakdown.other} max={week.plannedMinutes || 1} color={SPORT.strength.color} height={5} />
          </View>
        </Row>
        <T small muted>
          Total {formatMinutes(week.plannedMinutes)}
          {week.sessions.some((s) => s.sport === 'race') ? ' (incl. estimated race time)' : ''}
          {comp !== null ? ` · ${comp}% done` : ''}
        </T>
        {week.warnings.map((w) => (
          <Row key={w} style={{ alignItems: 'flex-start' }}>
            <Icon name="alert-outline" size={16} color={C.yellow} />
            <T small color={C.yellow} style={{ flex: 1 }}>
              {w}
            </T>
          </Row>
        ))}
        {week.phase !== 'race' ? (
          <Button
            small
            kind={week.isBusy ? 'secondary' : 'ghost'}
            icon="book-clock-outline"
            title={week.isBusy ? 'Busy week on: tap to restore full week' : 'Exams or work crunch? Make this a busy week'}
            onPress={() => toggleBusy(week.week)}
          />
        ) : null}
      </Card>

      {/* Days */}
      {WEEKDAY_SHORT.map((label, i) => {
        const date = addDays(week.startDate, i);
        const sessions = week.sessions.filter((s) => s.weekday === i);
        const isToday = date === today;
        return (
          <View key={label} style={{ gap: 6 }}>
            <Row>
              <T bold color={isToday ? C.accent : C.text}>
                {label} {prettyMonthDay(date)}
              </T>
              {isToday ? <Pill label="TODAY" color={C.accent} /> : null}
              {sessions.length === 0 ? (
                <T small muted>
                  · Rest
                </T>
              ) : null}
            </Row>
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} status={sessionStatus(s, today, matches, marks)} actual={matches.get(s.id)} compact />
            ))}
          </View>
        );
      })}
    </Screen>
  );
}
