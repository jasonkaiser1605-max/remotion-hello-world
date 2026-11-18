import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, Switch, View } from 'react-native';

import { addDays, mondayOnOrBefore, parseDate, prettyDate, WEEKDAY_SHORT, weekdayOf } from '@/lib/dates';
import { CM_PER_IN, LB_PER_KG } from '@/lib/nutrition';
import { totalWeeks } from '@/lib/plan';
import type { SkillLevel, Weekday } from '@/lib/types';
import { cssFromTest, estimateMaxHr } from '@/lib/zones';
import { healthSupported } from '@/services/health';
import { getApiKey, setApiKey } from '@/services/secrets';
import { useApp } from '@/store';
import { C } from '@/theme';

import { Button, Card, demoAllowed, Divider, Field, H2, Icon, Row, Segmented, SettingRow, Stepper, T } from './ui';

const LEVELS: { label: string; value: SkillLevel }[] = [
  { label: 'New', value: 'new' },
  { label: 'Weak', value: 'weak' },
  { label: 'Okay', value: 'okay' },
  { label: 'Decent', value: 'decent' },
  { label: 'Strong', value: 'strong' },
];

export function ProfileSection() {
  const p = useApp((s) => s.profile);
  const update = useApp((s) => s.updateProfile);
  const imperial = p.units === 'imperial';
  const inches = Math.round(p.heightCm / CM_PER_IN);
  return (
    <Card>
      <Field label="First name" value={p.name} onChangeText={(name) => update({ name })} placeholder="What should I call you?" />
      <SettingRow label="Units">
        <View style={{ width: 160 }}>
          <Segmented
            options={[
              { label: 'lb / ft', value: 'imperial' },
              { label: 'kg / cm', value: 'metric' },
            ]}
            value={p.units}
            onChange={(units) => update({ units })}
          />
        </View>
      </SettingRow>
      <SettingRow label="Age" hint="Used for heart-rate zones & calories">
        <Stepper value={p.age} onChange={(age) => update({ age })} min={14} max={80} />
      </SettingRow>
      <SettingRow label="Sex" hint="For calorie math (BMR)">
        <View style={{ width: 160 }}>
          <Segmented
            options={[
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
            ]}
            value={p.sex}
            onChange={(sex) => update({ sex })}
          />
        </View>
      </SettingRow>
      <SettingRow label="Height">
        {imperial ? (
          <Stepper
            value={inches}
            onChange={(v) => update({ heightCm: Math.round(v * CM_PER_IN * 10) / 10 })}
            min={48}
            max={90}
            format={(v) => `${Math.floor(v / 12)}'${v % 12}"`}
          />
        ) : (
          <Stepper value={Math.round(p.heightCm)} onChange={(v) => update({ heightCm: v })} min={120} max={230} format={(v) => `${v} cm`} />
        )}
      </SettingRow>
      <SettingRow label="Weight">
        {imperial ? (
          <Stepper
            value={Math.round(p.weightKg * LB_PER_KG)}
            onChange={(v) => update({ weightKg: Math.round((v / LB_PER_KG) * 10) / 10 })}
            min={80}
            max={400}
            format={(v) => `${v} lb`}
          />
        ) : (
          <Stepper value={p.weightKg} onChange={(v) => update({ weightKg: v })} step={0.5} min={35} max={180} format={(v) => `${v} kg`} />
        )}
      </SettingRow>
      <View style={{ gap: 6 }}>
        <T small muted>
          Daily life outside training
        </T>
        <Segmented
          options={[
            { label: 'Mostly sitting', value: 'desk' },
            { label: 'On my feet', value: 'onFeet' },
            { label: 'Physical job', value: 'physical' },
          ]}
          value={p.lifestyle}
          onChange={(lifestyle) => update({ lifestyle })}
        />
      </View>
    </Card>
  );
}

export function SportsSection() {
  const p = useApp((s) => s.profile);
  const st = useApp((s) => s.settings);
  const update = useApp((s) => s.updateProfile);
  const updateSettings = useApp((s) => s.updateSettings);
  const toggleSoccer = (d: Weekday) => {
    const set = new Set(st.soccerDays);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    updateSettings({ soccerDays: [...set].sort() as Weekday[] });
  };
  return (
    <Card>
      {(['swim', 'bike', 'run'] as const).map((sport) => (
        <View key={sport} style={{ gap: 6 }}>
          <T small muted>
            {sport === 'swim' ? 'Swimming' : sport === 'bike' ? 'Cycling' : 'Running'}
          </T>
          <Segmented options={LEVELS} value={p.levels[sport]} onChange={(v) => update({ levels: { ...p.levels, [sport]: v } })} />
        </View>
      ))}
      <Divider />
      <SettingRow label="Strength sessions / week" hint="You lift, so keep 2 in the early phases">
        <Stepper value={st.strengthPerWeek} onChange={(v) => updateSettings({ strengthPerWeek: v })} min={0} max={3} />
      </SettingRow>
      <View style={{ gap: 6 }}>
        <T small muted>
          Soccer days (practice or games). Leave empty in the off-season.
        </T>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {WEEKDAY_SHORT.map((d, i) => (
            <Button
              key={d}
              small
              title={d}
              kind={st.soccerDays.includes(i as Weekday) ? 'primary' : 'secondary'}
              onPress={() => toggleSoccer(i as Weekday)}
            />
          ))}
        </Row>
      </View>
      {st.soccerDays.length > 0 ? (
        <SettingRow label="Soccer session length">
          <Stepper value={st.soccerMinutes} onChange={(v) => updateSettings({ soccerMinutes: v })} step={15} min={30} max={150} format={(v) => `${v} min`} />
        </SettingRow>
      ) : null}
    </Card>
  );
}

export function ScheduleSection() {
  const st = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const total = st.availability.reduce((a, b) => a + b, 0);
  return (
    <Card>
      <T small muted>
        Max minutes you can train each day (school + work considered). Early weeks use far less; the plan never goes over
        these. Set 0 for rest days.
      </T>
      {WEEKDAY_SHORT.map((d, i) => (
        <SettingRow key={d} label={d}>
          <Stepper
            value={st.availability[i]}
            onChange={(v) => {
              const availability = [...st.availability];
              availability[i] = v;
              updateSettings({ availability });
            }}
            step={15}
            min={0}
            max={480}
            format={(v) => (v === 0 ? 'Rest' : v < 60 ? `${v} min` : `${Math.floor(v / 60)}h${v % 60 ? String(v % 60).padStart(2, '0') : ''}`)}
          />
        </SettingRow>
      ))}
      <T small muted>
        Up to {Math.round(total / 6) / 10} h/week. Peak weeks need ~12–13 h with a 5 h+ long-ride day.
      </T>
      <Divider />
      <SettingRow label="Long ride on">
        <View style={{ width: 150 }}>
          <Segmented
            options={[
              { label: 'Sat', value: 5 },
              { label: 'Sun', value: 6 },
            ]}
            value={st.longRideDay}
            onChange={(v) => updateSettings({ longRideDay: v as Weekday })}
          />
        </View>
      </SettingRow>
      <View style={{ gap: 6 }}>
        <T small muted>
          Usual training time (for meal timing)
        </T>
        <Segmented
          options={[
            { label: 'Morning', value: 'morning' },
            { label: 'Midday', value: 'midday' },
            { label: 'Evening', value: 'evening' },
          ]}
          value={st.trainingTime}
          onChange={(trainingTime) => updateSettings({ trainingTime })}
        />
      </View>
    </Card>
  );
}

function DateField({ label, value, onChange, step = 7 }: { label: string; value: string; onChange: (v: string) => void; step?: number }) {
  const [text, setText] = useState(value);
  // Reset the text box when the date changes from outside (±7d buttons).
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setText(value);
  }
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(parseDate(text).getTime());
  return (
    <View style={{ gap: 6 }}>
      <T small muted>
        {label} · {valid ? prettyDate(text) : 'use YYYY-MM-DD'}
      </T>
      <Row>
        <Button small kind="secondary" title={`−${step}d`} onPress={() => onChange(addDays(value, -step))} />
        <View style={{ flex: 1 }}>
          <Field value={text} onChangeText={(t) => {
            setText(t);
            if (/^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(parseDate(t).getTime())) onChange(t);
          }} />
        </View>
        <Button small kind="secondary" title={`+${step}d`} onPress={() => onChange(addDays(value, step))} />
      </Row>
    </View>
  );
}

export function RaceSection() {
  const st = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);
  const weeks = totalWeeks(st);
  return (
    <Card>
      <Field label="Race name" value={st.raceName} onChangeText={(raceName) => updateSettings({ raceName })} placeholder="e.g. IRONMAN Arizona" />
      <DateField label="Race day" value={st.raceDate} onChange={(raceDate) => updateSettings({ raceDate })} />
      <DateField
        label="Plan starts (Monday)"
        value={st.startDate}
        onChange={(d) => updateSettings({ startDate: mondayOnOrBefore(d) })}
      />
      <T small color={weeks < 30 ? C.yellow : C.muted}>
        {weeks} weeks of training{weekdayOf(st.raceDate) !== 6 ? ' · race isn’t on a Sunday, race week adjusts automatically' : ''}
        {weeks < 30 ? ' · under 30 weeks is tight for a first Ironman. Consider a later race or a 70.3 first.' : ''}
      </T>
      <SettingRow label="Sprint/Olympic tune-up" hint="End of Base phase (spring)">
        <Switch value={st.includeTuneUpRace} onValueChange={(v) => updateSettings({ includeTuneUpRace: v })} />
      </SettingRow>
      <SettingRow label="70.3 tune-up race" hint="End of Build, ~16 weeks out">
        <Switch value={st.include703} onValueChange={(v) => updateSettings({ include703: v })} />
      </SettingRow>
    </Card>
  );
}

function mmss(s: string): number | undefined {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function ZonesSection() {
  const p = useApp((s) => s.profile);
  const m = useApp((s) => s.markers);
  const update = useApp((s) => s.updateMarkers);
  const [t400, setT400] = useState('');
  const [t200, setT200] = useState('');
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v) || undefined);
  const a = mmss(t400);
  const b = mmss(t200);
  let css: number | undefined;
  try {
    css = a && b ? cssFromTest(a, b) : undefined;
  } catch {
    css = undefined;
  }
  return (
    <Card>
      <T small muted>
        Leave blank to use estimates. Your plan has tests in week 1–2 and at the end of each phase.
      </T>
      <Row>
        <View style={{ flex: 1 }}>
          <Field label={`Max HR (est. ${estimateMaxHr(p.age)})`} value={m.maxHr ? String(m.maxHr) : ''} onChangeText={(v) => update({ maxHr: num(v) })} keyboardType="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Resting HR" value={m.restingHr ? String(m.restingHr) : ''} onChangeText={(v) => update({ restingHr: num(v) })} keyboardType="numeric" />
        </View>
      </Row>
      <Row>
        <View style={{ flex: 1 }}>
          <Field label="Run threshold HR (LTHR)" value={m.lthr ? String(m.lthr) : ''} onChangeText={(v) => update({ lthr: num(v) })} keyboardType="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Bike FTP (watts)" value={m.ftp ? String(m.ftp) : ''} onChangeText={(v) => update({ ftp: num(v) })} keyboardType="numeric" />
        </View>
      </Row>
      <Divider />
      <T small bold>
        Swim CSS test
      </T>
      <Row>
        <View style={{ flex: 1 }}>
          <Field label="400 m time (m:ss)" value={t400} onChangeText={setT400} placeholder="8:30" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="200 m time (m:ss)" value={t200} onChangeText={setT200} placeholder="3:55" />
        </View>
      </Row>
      <Button
        small
        kind="secondary"
        disabled={!css}
        title={css ? `Save CSS ${Math.floor(css / 60)}:${String(css % 60).padStart(2, '0')} /100 m` : 'Enter both times'}
        onPress={() => css && update({ cssSecPer100: css })}
      />
      {m.cssSecPer100 ? (
        <T small muted>
          Current CSS: {Math.floor(m.cssSecPer100 / 60)}:{String(m.cssSecPer100 % 60).padStart(2, '0')} per 100 m
        </T>
      ) : null}
    </Card>
  );
}

export function HealthSection() {
  const connected = useApp((s) => s.healthConnected);
  const lastSync = useApp((s) => s.lastSync);
  const saveToHealth = useApp((s) => s.saveToHealth);
  const set = useApp((s) => s.set);
  const connectAndSync = useApp((s) => s.connectAndSync);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const supported = healthSupported();
  return (
    <Card>
      <Row>
        <Icon name="heart-pulse" color={C.red} />
        <T bold style={{ flex: 1 }}>
          Apple Health
        </T>
        <T small color={connected ? C.green : C.muted}>
          {connected ? 'Connected' : 'Not connected'}
        </T>
      </Row>
      <T small muted>
        Reads workouts (heart rate, distance, calories), resting HR, HRV, sleep, steps and VO₂max from Apple Health.
      </T>
      <Button
        title={connected ? 'Sync now' : 'Connect Apple Health'}
        icon="link-variant"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          const r = await connectAndSync();
          setMsg(r.message);
          setBusy(false);
        }}
      />
      {msg ? (
        <T small color={msg.startsWith('Synced') ? C.green : C.yellow}>
          {msg}
        </T>
      ) : lastSync ? (
        <T small muted>
          Last sync {new Date(lastSync).toLocaleString()}
        </T>
      ) : null}
      {!supported ? (
        <T small color={C.yellow}>
          {Platform.OS === 'web'
            ? 'Websites can’t read Apple Health. On the website, log workouts by tapping them and entering your watch’s numbers. Automatic Garmin/Apple Watch sync needs the installed iPhone app (see the README).'
            : 'Apple Health works in the installed iPhone app (development or TestFlight build), not in Expo Go.'}
        </T>
      ) : null}
      <SettingRow label="Save food & water to Apple Health">
        <Switch value={saveToHealth} onValueChange={(v) => set({ saveToHealth: v })} />
      </SettingRow>
      <Divider />
      <Row>
        <Icon name="watch" color={C.blue} size={18} />
        <T small bold>
          Garmin setup (one time)
        </T>
      </Row>
      <T small muted>
        1. In the Garmin Connect app open Settings → Connected Apps → Apple Health (menu names vary a little between app
        versions).{'\n'}2. Turn on sharing for
        Activities, Heart Rate, Sleep, Steps, Calories (and anything else offered).{'\n'}3. In the iPhone Health app →
        Browse → (any category) → Data Sources & Access, make sure Garmin Connect can write.{'\n'}4. Come back here and tap
        Sync. Garmin workouts show up with source “Connect”.
      </T>
      <Row>
        <Icon name="watch-variant" color={C.green} size={18} />
        <T small bold>
          Apple Watch
        </T>
      </Row>
      <T small muted>
        Nothing to set up. Record workouts with the Workout app (Pool Swim, Open Water, Outdoor Cycle, Outdoor Run, or
        Multisport for bricks) and they appear automatically.
      </T>
    </Card>
  );
}

export function ApiKeySection() {
  const [key, setKeyText] = useState('');
  const [saved, setSaved] = useState<boolean | null>(null);
  useEffect(() => {
    void getApiKey().then((k) => setSaved(!!k));
  }, []);
  return (
    <Card>
      <Row>
        <Icon name="camera-iris" color={C.accent} />
        <T bold style={{ flex: 1 }}>
          AI food photos
        </T>
        <T small color={saved ? C.green : C.muted}>
          {saved ? 'Key saved' : 'Off'}
        </T>
      </Row>
      <T small muted>
        Snap a meal and Claude estimates calories and macros. It uses your own Anthropic API key (about 1–2¢ per photo). The
        key is stored {Platform.OS === 'web' ? 'only in this browser on this phone' : 'in the iPhone Keychain'} and is sent only to
        api.anthropic.com.
      </T>
      <Field label="Anthropic API key" value={key} onChangeText={setKeyText} placeholder={saved ? '•••••••• (saved)' : 'sk-ant-…'} secure />
      <Row>
        <Button
          small
          title="Save key"
          disabled={!key.startsWith('sk-')}
          onPress={async () => {
            await setApiKey(key.trim());
            setKeyText('');
            setSaved(true);
          }}
          style={{ flex: 1 }}
        />
        {saved ? (
          <Button
            small
            kind="danger"
            title="Remove"
            onPress={async () => {
              await setApiKey(null);
              setSaved(false);
            }}
          />
        ) : null}
        <Button small kind="ghost" title="Get a key" onPress={() => void Linking.openURL('https://console.anthropic.com/settings/keys')} />
      </Row>
    </Card>
  );
}

export function NutritionSection() {
  const goal = useApp((s) => s.nutritionGoal);
  const sleep = useApp((s) => s.sleepGoalHours);
  const set = useApp((s) => s.set);
  return (
    <Card>
      <View style={{ gap: 6 }}>
        <T small muted>
          Nutrition goal
        </T>
        <Segmented
          options={[
            { label: 'Fuel performance', value: 'perform' },
            { label: 'Lean out', value: 'lean' },
            { label: 'Gain', value: 'gain' },
          ]}
          value={goal}
          onChange={(nutritionGoal) => set({ nutritionGoal })}
        />
        <T small muted>
          {goal === 'lean'
            ? 'Small deficit on rest/light days only, with higher protein. Never under-fuel big training days.'
            : goal === 'gain'
              ? '+300 kcal/day, mostly carbs.'
              : 'Eat to match training. Recommended at 5’8", 156 lb.'}
        </T>
      </View>
      <SettingRow label="Sleep goal">
        <Stepper value={sleep} onChange={(v) => set({ sleepGoalHours: v })} step={0.5} min={6} max={10} format={(v) => `${v} h`} />
      </SettingRow>
    </Card>
  );
}

export function DataSection() {
  const loadDemo = useApp((s) => s.loadDemo);
  const resetAll = useApp((s) => s.resetAll);
  const [confirm, setConfirm] = useState(false);
  return (
    <Card>
      {demoAllowed() ? (
        <Button kind="secondary" title="Load demo data (preview)" icon="flask-outline" onPress={loadDemo} />
      ) : null}
      {confirm ? (
        <Row>
          <Button kind="danger" title="Yes, erase everything" onPress={resetAll} style={{ flex: 1 }} />
          <Button kind="secondary" title="Cancel" onPress={() => setConfirm(false)} />
        </Row>
      ) : (
        <Pressable onPress={() => setConfirm(true)}>
          <T small color={C.red} style={{ textAlign: 'center', paddingVertical: 6 }}>
            Reset all app data
          </T>
        </Pressable>
      )}
    </Card>
  );
}

export { H2 };
