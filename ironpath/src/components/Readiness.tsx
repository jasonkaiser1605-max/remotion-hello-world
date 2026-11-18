import { useState } from 'react';
import { View } from 'react-native';

import type { Readiness } from '@/lib/readiness';
import type { CheckIn } from '@/lib/types';
import { useApp } from '@/store';
import { C } from '@/theme';

import { Button, Card, Icon, ProgressBar, Ring, Row, Segmented, T } from './ui';

export const LEVEL_COLOR = { green: C.green, yellow: C.yellow, red: C.red, unknown: C.faint };

export function ReadinessCard({ r, date, showComponents }: { r: Readiness; date: string; showComponents?: boolean }) {
  const checkIn = useApp((s) => s.checkIns[date]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const color = LEVEL_COLOR[r.level];
  return (
    <Card>
      <Row gap={14} style={{ alignItems: 'flex-start' }}>
        <Ring value={r.score ?? 0} max={100} size={84} stroke={9} color={color}>
          <T bold style={{ fontSize: 24, lineHeight: 28 }} color={color}>
            {r.score ?? '–'}
          </T>
          <T small muted style={{ fontSize: 10, lineHeight: 12 }}>
            READINESS
          </T>
        </Ring>
        <View style={{ flex: 1, gap: 4 }}>
          <T bold style={{ fontSize: 17 }}>
            {r.headline}
          </T>
          <T small muted>
            {r.advice}
          </T>
        </View>
      </Row>
      {showComponents && r.components.length > 0 ? (
        <View style={{ gap: 10, marginTop: 6 }}>
          {r.components.map((c) => (
            <View key={c.key} style={{ gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T small bold>
                  {c.label}
                </T>
                <T small muted>
                  {c.detail}
                </T>
              </Row>
              <ProgressBar value={c.score} max={100} color={c.score >= 75 ? C.green : c.score >= 55 ? C.yellow : C.red} height={6} />
            </View>
          ))}
        </View>
      ) : null}
      {!checkIn && !open ? (
        <Button title="20-second morning check-in" icon="emoticon-happy-outline" kind="secondary" small onPress={() => setOpen(true)} />
      ) : null}
      {checkIn && showComponents && !editing ? (
        <Button small kind="ghost" icon="pencil" title="Edit today’s check-in" onPress={() => setEditing(true)} />
      ) : null}
      {open || editing ? (
        <CheckInForm
          date={date}
          onDone={() => {
            setOpen(false);
            setEditing(false);
          }}
        />
      ) : null}
    </Card>
  );
}

const SCALE = [1, 2, 3, 4, 5].map((v) => ({ label: String(v), value: v }));

export function CheckInForm({ date, onDone }: { date: string; onDone?: () => void }) {
  const existing = useApp((s) => s.checkIns[date]);
  const save = useApp((s) => s.saveCheckIn);
  const [c, setC] = useState<CheckIn>(existing ?? { date, energy: 3, soreness: 2, stress: 2, motivation: 3 });
  const row = (label: string, hint: string, key: keyof Omit<CheckIn, 'date'>) => (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T small bold>
          {label}
        </T>
        <T small muted>
          {hint}
        </T>
      </Row>
      <Segmented options={SCALE} value={c[key]} onChange={(v) => setC({ ...c, [key]: v })} />
    </View>
  );
  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      <Row>
        <Icon name="clipboard-pulse-outline" size={18} color={C.accent} />
        <T bold>How do you feel?</T>
      </Row>
      {row('Energy', '1 wrecked · 5 great', 'energy')}
      {row('Muscle soreness', '1 none · 5 very sore', 'soreness')}
      {row('Life stress', '1 calm · 5 exams/work chaos', 'stress')}
      {row('Motivation', '1 none · 5 fired up', 'motivation')}
      <Button
        title={existing ? 'Update check-in' : 'Save check-in'}
        onPress={() => {
          save(c);
          onDone?.();
        }}
      />
    </View>
  );
}
