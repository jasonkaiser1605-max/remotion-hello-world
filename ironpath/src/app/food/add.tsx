import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';

import { Button, Card, Field, H2, Icon, Pill, Row, Screen, Segmented, Stepper, T } from '@/components/ui';
import { useDayData, useToday } from '@/hooks/useDay';
import { QUICK_FOODS, type QuickFood } from '@/lib/foods';
import { DAY_LOAD_INFO } from '@/lib/nutrition';
import { analyzeFoodPhoto, type FoodAnalysis, totals } from '@/services/foodVision';
import { getApiKey } from '@/services/secrets';
import { useApp } from '@/store';
import { C } from '@/theme';

type Mode = 'photo' | 'quick' | 'manual';

export default function AddFood() {
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const [mode, setMode] = useState<Mode>(params.mode ?? 'photo');
  return (
    <Screen edges={['bottom']}>
      <Segmented
        options={[
          { label: '📷 Photo', value: 'photo' },
          { label: '⚡ Quick', value: 'quick' },
          { label: '✏️ Manual', value: 'manual' },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'photo' ? <PhotoFlow /> : mode === 'quick' ? <QuickFlow /> : <ManualFlow />}
    </Screen>
  );
}

function nowParts(today: string) {
  return { date: today, time: new Date().toISOString() };
}

// ─────────────────────────── Photo ───────────────────────────

function PhotoFlow() {
  const today = useToday();
  const day = useDayData(today);
  const addFood = useApp((s) => s.addFood);
  const [apiKey, setKey] = useState<string | null | undefined>(undefined);
  const [photo, setPhoto] = useState<{ uri: string; base64: string } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysis | null>(null);
  const [portion, setPortion] = useState(1);
  const [name, setName] = useState('');

  useEffect(() => {
    void getApiKey().then(setKey);
  }, []);

  const pick = async (camera: boolean) => {
    setError(null);
    setResult(null);
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(camera ? 'Camera permission is needed to snap meals.' : 'Photo library permission is needed.');
      return;
    }
    const res = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    // Shrink to ~1024 px JPEG: plenty for food recognition, fast to upload, cheap.
    const ctx = ImageManipulator.manipulate(res.assets[0].uri);
    ctx.resize({ width: 1024 });
    const img = await ctx.renderAsync();
    const saved = await img.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
    if (!saved.base64) {
      setError('Could not read that image.');
      return;
    }
    setPhoto({ uri: saved.uri, base64: saved.base64.replace(/^data:image\/\w+;base64,/, '') });
  };

  const analyze = async () => {
    if (!photo || !apiKey) return;
    setBusy(true);
    setError(null);
    try {
      const next = day.sessions.find((x) => x.status === 'today' || x.status === 'upcoming')?.session ?? day.tomorrow[0];
      const r = await analyzeFoodPhoto(apiKey, photo.base64, {
        dayLabel: DAY_LOAD_INFO[day.targets.load].label,
        remaining: {
          kcal: Math.max(0, Math.round(day.targets.kcal - day.eaten.kcal)),
          proteinG: Math.max(0, Math.round(day.targets.proteinG - day.eaten.proteinG)),
          carbsG: Math.max(0, Math.round(day.targets.carbsG - day.eaten.carbsG)),
          fatG: Math.max(0, Math.round(day.targets.fatG - day.eaten.fatG)),
        },
        nextSession: next ? `${next.title}, ${next.minutes} min${day.tomorrow.includes(next) ? ' (tomorrow)' : ' (today)'}` : undefined,
        note: note || undefined,
      });
      if (!r.is_food) {
        setError('That doesn’t look like food. Try another photo.');
      } else {
        setResult(r);
        setName(r.meal_name);
        setPortion(1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (apiKey === null) {
    return (
      <Card accent={C.accent}>
        <T bold>Add your Anthropic API key to use photo logging</T>
        <T small muted>
          Photo logging uses Claude’s vision to estimate the meal. You need your own API key from console.anthropic.com
          (each photo costs roughly a cent or two). It’s stored only in your iPhone’s Keychain.
        </T>
        <Button title="Open Settings" onPress={() => router.push('/settings')} />
        <T small muted>
          No key? Use Quick or Manual. They work fully offline.
        </T>
      </Card>
    );
  }

  const t = result ? totals(result.items) : null;
  return (
    <View style={{ gap: 14 }}>
      {photo ? (
        <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: C.card }} />
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: 30 }}>
          <Icon name="food-variant" size={42} color={C.faint} />
          <T muted small style={{ textAlign: 'center' }}>
            Take the photo from above, with the whole plate in frame. A fork or hand in the shot helps with portion size.
          </T>
        </Card>
      )}
      <Row>
        {Platform.OS !== 'web' ? <Button title="Camera" icon="camera" onPress={() => pick(true)} style={{ flex: 1 }} /> : null}
        <Button title="Library" icon="image" kind="secondary" onPress={() => pick(false)} style={{ flex: 1 }} />
      </Row>
      {photo && !result ? (
        <>
          <Field label="Anything the photo can’t show? (optional)" value={note} onChangeText={setNote} placeholder="e.g. cooked in butter, I’ll eat half" />
          <Button title={busy ? 'Analyzing…' : 'Estimate calories & macros'} icon="auto-fix" loading={busy} onPress={analyze} />
        </>
      ) : null}
      {error ? (
        <Card accent={C.red}>
          <T small color={C.red}>
            {error}
          </T>
        </Card>
      ) : null}

      {result && t ? (
        <>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <T bold style={{ fontSize: 17, flex: 1 }}>
                {result.meal_name}
              </T>
              <Pill
                label={`${result.confidence} confidence`}
                color={result.confidence === 'high' ? C.green : result.confidence === 'medium' ? C.yellow : C.red}
              />
            </Row>
            {result.items.map((i, idx) => (
              <Row key={idx} style={{ justifyContent: 'space-between' }}>
                <T small style={{ flex: 1 }}>
                  {i.name} <T small muted>({i.portion})</T>
                </T>
                <T small bold>
                  {Math.round(i.kcal * portion)} kcal
                </T>
              </Row>
            ))}
            <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <T bold>Total</T>
              <T bold color={C.accent}>
                {Math.round(t.kcal * portion)} kcal
              </T>
            </Row>
            <T small muted>
              Protein {Math.round(t.proteinG * portion)} g · Carbs {Math.round(t.carbsG * portion)} g · Fat {Math.round(t.fatG * portion)} g · Fiber{' '}
              {Math.round(t.fiberG * portion)} g
            </T>
          </Card>
          <Card accent={result.health_score >= 7 ? C.green : result.health_score >= 4 ? C.yellow : C.red}>
            <T small bold>
              Athlete score {Math.round(result.health_score)}/10
            </T>
            <T small muted>
              {result.athlete_tip}
            </T>
          </Card>
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <T small bold>
                How much did you eat?
              </T>
              <Stepper value={portion} onChange={setPortion} step={0.25} min={0.25} max={3} format={(v) => `${Math.round(v * 100)}%`} />
            </Row>
            <Field label="Name" value={name} onChangeText={setName} />
          </Card>
          <Button
            title="Save to food log"
            icon="check"
            onPress={() => {
              addFood({
                ...nowParts(today),
                name: name || result.meal_name,
                kcal: Math.round(t.kcal * portion),
                proteinG: Math.round(t.proteinG * portion),
                carbsG: Math.round(t.carbsG * portion),
                fatG: Math.round(t.fatG * portion),
                fiberG: Math.round(t.fiberG * portion),
                source: 'photo',
                photoUri: photo?.uri,
                note: note || undefined,
              });
              router.back();
            }}
          />
          <T small muted style={{ textAlign: 'center' }}>
            Photo estimates are typically within ~20%. Good enough to steer your fueling, not lab-accurate.
          </T>
        </>
      ) : null}
    </View>
  );
}

// ─────────────────────────── Quick ───────────────────────────

function QuickFlow() {
  const today = useToday();
  const addFood = useApp((s) => s.addFood);
  const [servings, setServings] = useState(1);
  const [added, setAdded] = useState<string | null>(null);
  const add = (f: QuickFood) => {
    addFood({
      ...nowParts(today),
      name: servings === 1 ? f.name : `${f.name} ×${servings}`,
      kcal: Math.round(f.kcal * servings),
      proteinG: Math.round(f.proteinG * servings * 10) / 10,
      carbsG: Math.round(f.carbsG * servings * 10) / 10,
      fatG: Math.round(f.fatG * servings * 10) / 10,
      source: 'quick',
    });
    setAdded(f.name);
  };
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T small bold>
          Servings
        </T>
        <Stepper value={servings} onChange={setServings} step={0.5} min={0.5} max={5} format={(v) => `×${v}`} />
      </Row>
      {added ? (
        <T small color={C.green}>
          ✓ Added {added}
        </T>
      ) : null}
      {(['fuel', 'recovery', 'carb', 'protein', 'snack', 'meal'] as const).map((tag) => (
        <View key={tag} style={{ gap: 6 }}>
          <H2>{{ fuel: 'Training fuel', recovery: 'Recovery', carb: 'Carbs', protein: 'Protein', snack: 'Snacks', meal: 'Meals' }[tag]}</H2>
          <Card style={{ gap: 0, paddingVertical: 4 }}>
            {QUICK_FOODS.filter((f) => f.tag === tag).map((f) => (
              <Pressable key={f.name} onPress={() => add(f)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: 9 })}>
                <Row>
                  <View style={{ flex: 1 }}>
                    <T small bold>
                      {f.name}
                    </T>
                    <T small muted>
                      {f.serving} · P {f.proteinG} · C {f.carbsG} · F {f.fatG}
                    </T>
                  </View>
                  <T small bold>
                    {Math.round(f.kcal * servings)}
                  </T>
                  <Icon name="plus-circle" color={C.accent} />
                </Row>
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────── Manual ───────────────────────────

function ManualFlow() {
  const today = useToday();
  const addFood = useApp((s) => s.addFood);
  const [f, setF] = useState({ name: '', kcal: '', p: '', c: '', fat: '' });
  const num = (s: string) => Math.max(0, Number(s.replace(',', '.')) || 0);
  const derived = num(f.p) * 4 + num(f.c) * 4 + num(f.fat) * 9;
  return (
    <View style={{ gap: 12 }}>
      <Field label="Food" value={f.name} onChangeText={(name) => setF({ ...f, name })} placeholder="e.g. Turkey sandwich" />
      <Row>
        <View style={{ flex: 1 }}>
          <Field label="Protein (g)" value={f.p} onChangeText={(p) => setF({ ...f, p })} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Carbs (g)" value={f.c} onChangeText={(c) => setF({ ...f, c })} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Fat (g)" value={f.fat} onChangeText={(fat) => setF({ ...f, fat })} keyboardType="decimal-pad" />
        </View>
      </Row>
      <Field
        label={`Calories${derived > 0 ? ` (macros add up to ${Math.round(derived)})` : ''}`}
        value={f.kcal}
        onChangeText={(kcal) => setF({ ...f, kcal })}
        keyboardType="numeric"
        placeholder={derived > 0 ? String(Math.round(derived)) : ''}
      />
      <Button
        title="Save"
        icon="check"
        disabled={!f.name || (num(f.kcal) === 0 && derived === 0)}
        onPress={() => {
          addFood({
            ...nowParts(today),
            name: f.name,
            kcal: num(f.kcal) || Math.round(derived),
            proteinG: num(f.p),
            carbsG: num(f.c),
            fatG: num(f.fat),
            source: 'manual',
          });
          router.back();
        }}
      />
    </View>
  );
}
