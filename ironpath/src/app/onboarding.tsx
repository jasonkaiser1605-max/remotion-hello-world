import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ApiKeySection, HealthSection, ProfileSection, RaceSection, ScheduleSection, SportsSection } from '@/components/forms';
import { Button, Card, H1, Icon, Row, Screen, T } from '@/components/ui';
import { formatMinutes, prettyDate } from '@/lib/dates';
import { PHASE_INFO } from '@/lib/plan';
import { useApp, usePlan } from '@/store';
import { C, SPORT } from '@/theme';

const STEPS = ['Welcome', 'About you', 'Your sports', 'Your week', 'Devices'];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const complete = useApp((s) => s.completeOnboarding);
  const plan = usePlan();
  const first = plan[0];

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else {
      complete();
      router.replace('/');
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Row gap={6}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? C.accent : C.cardHi }} />
        ))}
      </Row>

      {step === 0 ? (
        <>
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
            <Row gap={14}>
              <Icon name="swim" size={34} color={SPORT.swim.color} />
              <Icon name="bike" size={34} color={SPORT.bike.color} />
              <Icon name="run" size={34} color={SPORT.run.color} />
            </Row>
            <H1 style={{ textAlign: 'center' }}>Your road to 140.6</H1>
            <T muted style={{ textAlign: 'center' }}>
              A year-long, beginner-friendly Ironman plan that fits around school and work, syncs your Garmin and Apple Watch,
              and coaches your fueling, hydration and recovery.
            </T>
          </View>
          <Card>
            {[
              ['calendar-check', 'A 52-week periodized plan: Foundation → Base → Build → Ironman-specific → Taper'],
              ['swim', 'Extra swim focus with technique drills, because swimming is your limiter'],
              ['clock-outline', 'Fits the minutes you actually have each day'],
              ['watch-variant', 'Auto-imports workouts, HR, sleep and HRV via Apple Health'],
              ['camera', 'Snap a photo of your food → calories & macros'],
              ['heart-pulse', 'Daily readiness score: train, go easy, or rest'],
            ].map(([icon, text]) => (
              <Row key={text} style={{ alignItems: 'flex-start' }}>
                <Icon name={icon} size={18} color={C.accent} />
                <T small style={{ flex: 1 }}>
                  {text}
                </T>
              </Row>
            ))}
          </Card>
          <T small muted style={{ textAlign: 'center' }}>
            I pre-filled what you told me: 5′8″, 156 lb, weak swimmer, decent cyclist, okay runner, soccer player who lifts.
          </T>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <H1>About you</H1>
          <ProfileSection />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <H1>Your sports</H1>
          <SportsSection />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <H1>Your week & race</H1>
          <ScheduleSection />
          <RaceSection />
          {first ? (
            <Card accent={PHASE_INFO[first.phase].color}>
              <T bold>Your first week ({prettyDate(first.startDate)})</T>
              <T small muted>
                {first.sessions.length} sessions · {formatMinutes(first.plannedMinutes)} total
              </T>
              {first.sessions.map((s) => (
                <T key={s.id} small>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][s.weekday]} · {s.title} · {formatMinutes(s.minutes)}
                </T>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}

      {step === 4 ? (
        <>
          <H1>Connect your devices</H1>
          <HealthSection />
          <ApiKeySection />
          <T small muted>
            You can do both of these later in Settings.
          </T>
        </>
      ) : null}

      <Row>
        {step > 0 ? <Button title="Back" kind="secondary" onPress={() => setStep(step - 1)} /> : null}
        <Button title={step === STEPS.length - 1 ? 'Start training' : step === 0 ? 'Let’s build my plan' : 'Next'} onPress={next} style={{ flex: 1 }} />
      </Row>
    </Screen>
  );
}
