import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { CaloriesCard, WaterCard } from '@/components/Fuel';
import { Button, Card, Field, H1, H2, Icon, Row, Screen, T } from '@/components/ui';
import { useDayData, useToday } from '@/hooks/useDay';
import { addDays, prettyDate } from '@/lib/dates';
import { DAY_LOAD_INFO, LB_PER_KG, mealTimeline, sweatRate } from '@/lib/nutrition';
import { useApp } from '@/store';
import { C } from '@/theme';

export default function FuelScreen() {
  const today = useToday();
  const [date, setDate] = useState(today);
  const day = useDayData(date);
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);
  const removeFood = useApp((s) => s.removeFood);

  const timeline = useMemo(
    () =>
      mealTimeline(
        profile,
        day.sessions.filter((x) => x.status !== 'skipped').map((x) => x.session),
        settings.trainingTime,
        day.tomorrowLongest,
      ),
    [profile, day, settings.trainingTime],
  );

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Fuel</H1>
        <Row gap={14}>
          <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={10}>
            <Icon name="chevron-left" size={26} color={C.muted} />
          </Pressable>
          <T bold>{date === today ? 'Today' : prettyDate(date)}</T>
          <Pressable onPress={() => setDate(addDays(date, 1))} hitSlop={10}>
            <Icon name="chevron-right" size={26} color={C.muted} />
          </Pressable>
        </Row>
      </Row>

      <Card accent={C.carbs}>
        <T bold>{DAY_LOAD_INFO[day.targets.load].label}</T>
        <T small muted>
          {DAY_LOAD_INFO[day.targets.load].blurb} Carbs today: ~{day.targets.carbsPerKg} g/kg · protein ~
          {Math.round((day.targets.proteinG / profile.weightKg) * 10) / 10} g/kg.
        </T>
        {day.sessions.length > 0 ? (
          <T small muted>
            Training: {day.sessions.map((x) => `${x.session.title} (${x.session.sport === 'race' ? 'race' : `${x.session.minutes} min`})`).join(' + ')}
          </T>
        ) : null}
      </Card>

      <CaloriesCard targets={day.targets} eaten={day.eaten} />

      <Row>
        <Button title="Snap meal" icon="camera" onPress={() => router.push('/food/add?mode=photo')} style={{ flex: 1 }} />
        <Button title="Quick add" icon="lightning-bolt" kind="secondary" onPress={() => router.push('/food/add?mode=quick')} style={{ flex: 1 }} />
        <Button title="" icon="pencil" kind="secondary" onPress={() => router.push('/food/add?mode=manual')} />
      </Row>

      <WaterCard date={date} ml={day.waterMl} target={day.targets.waterMl} />

      <H2>Logged {date === today ? 'today' : ''}</H2>
      {day.meals.length === 0 ? (
        <Card>
          <T small muted>
            Nothing logged yet. Snap a photo of your plate and the app estimates calories and macros for you.
          </T>
        </Card>
      ) : (
        <Card>
          {day.meals.map((m) => (
            <Row key={m.id} style={{ paddingVertical: 4 }}>
              <Icon name={m.source === 'photo' ? 'camera' : m.source === 'quick' ? 'lightning-bolt' : 'pencil'} size={16} color={C.faint} />
              <View style={{ flex: 1 }}>
                <T small bold numberOfLines={1}>
                  {m.name}
                </T>
                <T small muted>
                  {new Date(m.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · P {Math.round(m.proteinG)} · C{' '}
                  {Math.round(m.carbsG)} · F {Math.round(m.fatG)}
                </T>
              </View>
              <T bold>{Math.round(m.kcal)}</T>
              <Pressable onPress={() => removeFood(m.id)} hitSlop={8}>
                <Icon name="close" size={16} color={C.faint} />
              </Pressable>
            </Row>
          ))}
        </Card>
      )}

      <H2>When to eat</H2>
      <Card>
        {timeline.map((t, i) => (
          <Row key={i} gap={12} style={{ alignItems: 'flex-start', paddingVertical: 5 }}>
            <View style={{ width: 74 }}>
              <T small bold color={t.emphasis ? C.carbs : C.muted}>
                {t.when}
              </T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T small bold>
                {t.title}
              </T>
              <T small muted>
                {t.detail}
              </T>
            </View>
          </Row>
        ))}
        <T small muted style={{ marginTop: 4 }}>
          Times assume you train in the {settings.trainingTime}. Change it in Settings.
        </T>
      </Card>

      <SweatRateCard />

      <Card onPress={() => router.push('/learn')}>
        <Row>
          <Icon name="book-open-variant" color={C.accent} size={18} />
          <T small bold>
            What to eat: staples, race nutrition, budget tips →
          </T>
        </Row>
      </Card>
    </Screen>
  );
}

function SweatRateCard() {
  const units = useApp((s) => s.profile.units);
  const markers = useApp((s) => s.markers);
  const updateMarkers = useApp((s) => s.updateMarkers);
  const [open, setOpen] = useState(false);
  const [pre, setPre] = useState('');
  const [post, setPost] = useState('');
  const [drank, setDrank] = useState('0');
  const [mins, setMins] = useState('60');
  const toKg = (v: string) => (units === 'imperial' ? Number(v) / LB_PER_KG : Number(v));
  const result =
    pre && post && Number(mins) > 0 ? sweatRate(toKg(pre), toKg(post), Number(drank) || 0, Number(mins)) : undefined;

  return (
    <Card>
      <Pressable onPress={() => setOpen(!open)}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <Icon name="water-percent" color={C.water} size={18} />
            <T small bold>
              Sweat-rate test
            </T>
          </Row>
          <T small muted>
            {markers.sweatRateMlPerHr ? `${markers.sweatRateMlPerHr} mL/h` : 'Not tested'} {open ? '▲' : '▼'}
          </T>
        </Row>
      </Pressable>
      {open ? (
        <View style={{ gap: 10 }}>
          <T small muted>
            Weigh yourself without clothes right before and after a ~60 min run or ride. Note how much you drank. Do it once in
            warm and once in cool weather.
          </T>
          <Row>
            <View style={{ flex: 1 }}>
              <Field label={`Before (${units === 'imperial' ? 'lb' : 'kg'})`} value={pre} onChangeText={setPre} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={`After (${units === 'imperial' ? 'lb' : 'kg'})`} value={post} onChangeText={setPost} keyboardType="decimal-pad" />
            </View>
          </Row>
          <Row>
            <View style={{ flex: 1 }}>
              <Field label="Drank (mL)" value={drank} onChangeText={setDrank} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Minutes" value={mins} onChangeText={setMins} keyboardType="numeric" />
            </View>
          </Row>
          {result !== undefined ? (
            <T bold color={C.water}>
              Sweat rate ≈ {result} mL/hour. Drink ~{Math.round((result * 0.75) / 50) * 50} mL/h on long sessions.
            </T>
          ) : null}
          <Button
            title="Save sweat rate"
            disabled={result === undefined}
            onPress={() => {
              if (result !== undefined) updateMarkers({ sweatRateMlPerHr: result });
              setOpen(false);
            }}
          />
        </View>
      ) : null}
    </Card>
  );
}
