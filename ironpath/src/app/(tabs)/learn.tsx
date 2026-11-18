import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, H1, H2, Icon, Row, Screen, T } from '@/components/ui';
import { formatPace } from '@/lib/dates';
import { ARTICLES } from '@/lib/knowledge';
import { heartRateZones, powerZones, swimPaces } from '@/lib/zones';
import { useApp } from '@/store';
import { C, ZONE_COLORS } from '@/theme';

export default function LearnScreen() {
  const profile = useApp((s) => s.profile);
  const markers = useApp((s) => s.markers);
  const [open, setOpen] = useState<string | null>('ironman-101');
  const zones = heartRateZones(profile.age, markers);

  return (
    <Screen>
      <H1>Learn</H1>

      <H2>Your zones</H2>
      <Card>
        <T small muted>
          {markers.lthr
            ? `Based on your threshold HR of ${markers.lthr} bpm.`
            : `Estimated from your age${markers.restingHr ? ' and resting HR' : ''}. Do the run test in week 1 for accurate zones.`}
        </T>
        {zones.map((z) => (
          <Row key={z.zone} gap={10} style={{ paddingVertical: 3 }}>
            <View style={{ width: 6, height: 28, borderRadius: 3, backgroundColor: ZONE_COLORS[z.zone - 1] }} />
            <View style={{ width: 92 }}>
              <T small bold>
                Z{z.zone} {z.name}
              </T>
            </View>
            <T small bold style={{ width: 72 }}>
              {z.low}–{z.high}
            </T>
            <T small muted style={{ flex: 1 }}>
              {z.feel}
            </T>
          </Row>
        ))}
        {markers.cssSecPer100 ? (
          <T small muted>
            Swim (per 100 m): easy {formatPace(swimPaces(markers.cssSecPer100).easy)} · steady{' '}
            {formatPace(swimPaces(markers.cssSecPer100).endurance)} · CSS {formatPace(markers.cssSecPer100)}
          </T>
        ) : null}
        {markers.ftp ? (
          <T small muted>
            Bike power: {powerZones(markers.ftp).map((p) => `Z${p.zone} ${p.low}–${p.high} W`).join(' · ')}
          </T>
        ) : null}
      </Card>

      <H2>Guides</H2>
      {ARTICLES.map((a) => {
        const isOpen = open === a.id;
        return (
          <Card key={a.id}>
            <Pressable onPress={() => setOpen(isOpen ? null : a.id)}>
              <Row gap={12}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: C.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={a.icon} size={20} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <T bold>{a.title}</T>
                  <T small muted>
                    {a.blurb}
                  </T>
                </View>
                <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} color={C.faint} />
              </Row>
            </Pressable>
            {isOpen
              ? a.sections.map((s, i) => (
                  <View key={i} style={{ gap: 6, marginTop: 6 }}>
                    {s.heading ? (
                      <T bold color={C.accent}>
                        {s.heading}
                      </T>
                    ) : null}
                    {s.bullets.map((b) => (
                      <Row key={b} style={{ alignItems: 'flex-start' }}>
                        <T small color={C.accent}>
                          •
                        </T>
                        <T small style={{ flex: 1 }}>
                          {b}
                        </T>
                      </Row>
                    ))}
                  </View>
                ))
              : null}
          </Card>
        );
      })}
      <T small muted style={{ textAlign: 'center' }}>
        General training guidance, not medical advice. Check with a doctor before starting a big training block.
      </T>
    </Screen>
  );
}
