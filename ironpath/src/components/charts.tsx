import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { C } from '@/theme';

import { Row, T } from './ui';

export function Sparkline({
  series,
  height = 70,
  colors,
}: {
  series: (number | undefined)[][];
  height?: number;
  colors: string[];
}) {
  const [w, setW] = useState(300);
  const all = series.flat().filter((v): v is number => typeof v === 'number');
  if (all.length < 2) {
    return (
      <View style={{ height, justifyContent: 'center' }}>
        <T small muted>
          Not enough data yet.
        </T>
      </View>
    );
  }
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const pad = 4;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      <Svg width={w} height={height}>
        {min < 0 && max > 0 ? (
          <Line
            x1={0}
            x2={w}
            y1={pad + ((max - 0) / span) * (height - 2 * pad)}
            y2={pad + ((max - 0) / span) * (height - 2 * pad)}
            stroke={C.border}
            strokeDasharray="4 4"
          />
        ) : null}
        {series.map((s, si) => {
          const n = s.length;
          const pts = s
            .map((v, i) =>
              typeof v === 'number'
                ? `${(i / Math.max(1, n - 1)) * w},${pad + ((max - v) / span) * (height - 2 * pad)}`
                : null,
            )
            .filter(Boolean)
            .join(' ');
          return <Polyline key={si} points={pts} fill="none" stroke={colors[si]} strokeWidth={2.5} strokeLinejoin="round" />;
        })}
      </Svg>
    </View>
  );
}

export function Bars({
  values,
  labels,
  goal,
  color,
  height = 90,
  format,
}: {
  values: (number | undefined)[];
  labels: string[];
  goal?: number;
  color: string;
  height?: number;
  format?: (v: number) => string;
}) {
  const max = Math.max(goal ?? 0, ...values.map((v) => v ?? 0)) || 1;
  return (
    <View style={{ gap: 4 }}>
      <Row gap={6} style={{ height, alignItems: 'flex-end' }}>
        {values.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height }}>
            {typeof v === 'number' ? (
              <>
                <T small muted style={{ fontSize: 10, lineHeight: 12 }}>
                  {format ? format(v) : Math.round(v)}
                </T>
                <View
                  style={{
                    width: '70%',
                    height: Math.max(3, (v / max) * (height - 16)),
                    borderRadius: 4,
                    backgroundColor: goal && v < goal * 0.85 ? `${color}88` : color,
                  }}
                />
              </>
            ) : (
              <View style={{ width: '70%', height: 3, backgroundColor: C.border, borderRadius: 2 }} />
            )}
          </View>
        ))}
      </Row>
      <Row gap={6}>
        {labels.map((l, i) => (
          <T key={i} small muted style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>
            {l}
          </T>
        ))}
      </Row>
    </View>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <Row gap={12} style={{ flexWrap: 'wrap' }}>
      {items.map((i) => (
        <Row key={i.label} gap={5}>
          <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: i.color }} />
          <T small muted>
            {i.label}
          </T>
        </Row>
      ))}
    </Row>
  );
}
