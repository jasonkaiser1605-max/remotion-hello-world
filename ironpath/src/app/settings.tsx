import {
  ApiKeySection,
  DataSection,
  H2,
  HealthSection,
  NutritionSection,
  ProfileSection,
  RaceSection,
  ScheduleSection,
  SportsSection,
  ZonesSection,
} from '@/components/forms';
import { Screen, T } from '@/components/ui';

export default function Settings() {
  return (
    <Screen edges={['bottom']}>
      <H2>Devices</H2>
      <HealthSection />
      <ApiKeySection />
      <H2>Race</H2>
      <RaceSection />
      <H2>Weekly schedule</H2>
      <ScheduleSection />
      <H2>Sports & soccer</H2>
      <SportsSection />
      <H2>Zones & tests</H2>
      <ZonesSection />
      <H2>Nutrition & sleep</H2>
      <NutritionSection />
      <H2>About you</H2>
      <ProfileSection />
      <H2>Data</H2>
      <DataSection />
      <T small muted style={{ textAlign: 'center' }}>
        IronPath · your data stays on your phone.
      </T>
    </Screen>
  );
}
