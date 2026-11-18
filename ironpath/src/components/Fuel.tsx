import { View } from 'react-native';

import type { DailyTargets } from '@/lib/nutrition';
import { useApp } from '@/store';
import { C } from '@/theme';

import { Button, Card, Icon, ProgressBar, Ring, Row, T } from './ui';

export function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <View style={{ gap: 4, flex: 1 }}>
      <T small bold color={color}>
        {label}
      </T>
      <ProgressBar value={value} max={target} color={color} height={6} />
      <T small muted>
        {Math.round(value)} / {target} g
      </T>
    </View>
  );
}

export function CaloriesCard({
  targets,
  eaten,
}: {
  targets: DailyTargets;
  eaten: { kcal: number; proteinG: number; carbsG: number; fatG: number };
}) {
  const remaining = targets.kcal - eaten.kcal;
  return (
    <Card>
      <Row gap={16}>
        <Ring value={eaten.kcal} max={targets.kcal} size={96} stroke={10} color={C.accent}>
          <T bold style={{ fontSize: 20, lineHeight: 24 }}>
            {Math.abs(Math.round(remaining))}
          </T>
          <T small muted style={{ fontSize: 10, lineHeight: 12 }}>
            {remaining >= 0 ? 'KCAL LEFT' : 'KCAL OVER'}
          </T>
        </Ring>
        <View style={{ flex: 1, gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T small muted>
              Target
            </T>
            <T small bold>
              {targets.kcal} kcal
            </T>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T small muted>
              Eaten
            </T>
            <T small bold>
              {Math.round(eaten.kcal)} kcal
            </T>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T small muted>
              Training burn
            </T>
            <T small bold>
              {targets.exerciseKcal} kcal
            </T>
          </Row>
        </View>
      </Row>
      <Row gap={12}>
        <MacroBar label="Protein" value={eaten.proteinG} target={targets.proteinG} color={C.protein} />
        <MacroBar label="Carbs" value={eaten.carbsG} target={targets.carbsG} color={C.carbs} />
        <MacroBar label="Fat" value={eaten.fatG} target={targets.fatG} color={C.fat} />
      </Row>
    </Card>
  );
}

export function WaterCard({ date, ml, target }: { date: string; ml: number; target: number }) {
  const add = useApp((s) => s.addWater);
  const undo = useApp((s) => s.undoWater);
  const glasses = Math.round(ml / 250);
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row>
          <Icon name="cup-water" color={C.water} />
          <T bold>Water</T>
        </Row>
        <T small muted>
          {(ml / 1000).toFixed(2)} / {(target / 1000).toFixed(1)} L · {glasses} glasses
        </T>
      </Row>
      <ProgressBar value={ml} max={target} color={C.water} height={10} />
      <Row>
        <Button small kind="secondary" title="+250 mL" onPress={() => add(250)} style={{ flex: 1 }} />
        <Button small kind="secondary" title="+500 mL" onPress={() => add(500)} style={{ flex: 1 }} />
        <Button small kind="secondary" title="+750 mL" onPress={() => add(750)} style={{ flex: 1 }} />
        <Button small kind="ghost" title="" icon="undo" onPress={() => undo(date)} />
      </Row>
    </Card>
  );
}
