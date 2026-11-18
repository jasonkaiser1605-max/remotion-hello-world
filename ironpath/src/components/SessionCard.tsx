import { router } from 'expo-router';
import { View } from 'react-native';

import { formatDistance, formatMinutes } from '@/lib/dates';
import type { SessionStatus } from '@/lib/match';
import type { CompletedWorkout, PlannedSession } from '@/lib/types';
import { useApp } from '@/store';
import { C, SPORT, ZONE_COLORS } from '@/theme';

import { Card, Icon, Pill, Row, SportBadge, T } from './ui';

const STATUS: Record<SessionStatus, { label: string; color: string; icon: string } | null> = {
  done: { label: 'Done', color: C.green, icon: 'check-circle' },
  skipped: { label: 'Skipped', color: C.faint, icon: 'close-circle-outline' },
  missed: { label: 'Missed', color: C.red, icon: 'alert-circle-outline' },
  today: null,
  upcoming: null,
};

export function SessionCard({
  session,
  status,
  actual,
  compact,
}: {
  session: PlannedSession;
  status: SessionStatus;
  actual?: CompletedWorkout;
  compact?: boolean;
}) {
  const imperial = useApp((s) => s.profile.units === 'imperial');
  const st = STATUS[status];
  const color = SPORT[session.sport].color;
  return (
    <Card onPress={() => router.push(`/workout/${session.id}`)} accent={color} style={compact ? { padding: 12 } : undefined}>
      <Row gap={12}>
        <SportBadge sport={session.sport} size={compact ? 32 : 40} />
        <View style={{ flex: 1, gap: 2 }}>
          <Row>
            <T bold style={{ flexShrink: 1 }} numberOfLines={1}>
              {session.title}
            </T>
            {session.key && status !== 'done' ? <Pill label="KEY" color={C.accent} /> : null}
          </Row>
          <T small muted numberOfLines={compact ? 1 : 2}>
            {session.sport === 'race' ? session.summary : `${formatMinutes(session.minutes)} · ${session.summary.replace(/^\d+ min · /, '')}`}
          </T>
          {actual ? (
            <T small color={C.green}>
              {formatMinutes(actual.minutes)}
              {actual.distanceM ? ` · ${formatDistance(actual.distanceM, actual.sport, imperial)}` : ''}
              {actual.avgHr ? ` · ${actual.avgHr} bpm` : ''}
              {actual.kcal ? ` · ${actual.kcal} kcal` : ''} · {actual.source}
            </T>
          ) : null}
        </View>
        {st ? (
          <Icon name={st.icon} size={22} color={st.color} />
        ) : session.sport !== 'race' && session.sport !== 'strength' && session.sport !== 'soccer' ? (
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ZONE_COLORS[session.zone - 1] }} />
            <T small muted>
              Z{session.zone}
            </T>
          </View>
        ) : (
          <Icon name="chevron-right" color={C.faint} />
        )}
      </Row>
    </Card>
  );
}
