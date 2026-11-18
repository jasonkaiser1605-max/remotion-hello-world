import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

// Food photo → calories & macros with Claude's vision. The request goes straight from
// your phone to the Anthropic API using *your* API key (stored in the iOS Keychain).
// Nothing is sent anywhere else.

export const MODEL = 'claude-opus-5-5';

const FoodItem = z.object({
  name: z.string().describe('Short food name, e.g. "Grilled chicken breast"'),
  portion: z.string().describe('Estimated portion in everyday units, e.g. "~150 g" or "1 cup"'),
  kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number(),
});

const FoodAnalysisSchema = z.object({
  is_food: z.boolean().describe('false if the photo does not show food or drink'),
  meal_name: z.string().describe('2–5 word name for the whole plate'),
  items: z.array(FoodItem),
  confidence: z.enum(['low', 'medium', 'high']),
  health_score: z.number().describe('1–10 for an endurance athlete in training'),
  athlete_tip: z
    .string()
    .describe('One or two sentences of practical advice, tailored to the training context given'),
});

export type FoodAnalysis = z.infer<typeof FoodAnalysisSchema>;

export interface FoodContext {
  dayLabel: string; // e.g. "Big training day"
  remaining: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  nextSession?: string; // e.g. "Long ride 4 h tomorrow morning"
  note?: string; // anything the user typed ("I only ate half")
}

const SYSTEM = `You are a sports dietitian helping an amateur triathlete training for their first Ironman.
Estimate the nutrition of the food in the photo.
- Identify each distinct item and estimate its portion from visual cues (plate size, utensils, hands, packaging).
- Use standard nutrition-database values for the estimated portions. Include cooking oils, sauces and dressings you can see.
- If there is a nutrition label or packaging, prefer it.
- Be realistic, not optimistic: people under-report calories, so when uncertain pick the middle of a plausible range.
- If the photo isn't food, set is_food=false and return an empty items list.
The athlete_tip should relate the meal to their training context (carbs before long sessions, protein after, hydration).`;

export class FoodVisionError extends Error {}

export async function analyzeFoodPhoto(
  apiKey: string,
  base64Jpeg: string,
  ctx: FoodContext,
): Promise<FoodAnalysis> {
  const client = new Anthropic({
    apiKey,
    // The key belongs to the phone's owner and is kept in the Keychain; this flag only
    // allows the SDK to run outside a server (React Native / web preview).
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
    timeout: 90_000,
  });

  const context = [
    `Training context: ${ctx.dayLabel}.`,
    `Still to eat today: ~${ctx.remaining.kcal} kcal, ${ctx.remaining.proteinG} g protein, ${ctx.remaining.carbsG} g carbs, ${ctx.remaining.fatG} g fat.`,
    ctx.nextSession ? `Next session: ${ctx.nextSession}.` : '',
    ctx.note ? `Athlete's note about this photo: ${ctx.note}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(FoodAnalysisSchema) },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Jpeg } },
            { type: 'text', text: context },
          ],
        },
      ],
    });
    if (response.stop_reason === 'refusal') {
      throw new FoodVisionError('Claude could not analyze this photo. Try another angle or log it manually.');
    }
    if (!response.parsed_output) {
      throw new FoodVisionError('Could not read the nutrition estimate. Please try again.');
    }
    return response.parsed_output;
  } catch (e) {
    if (e instanceof FoodVisionError) throw e;
    if (e instanceof Anthropic.AuthenticationError) {
      throw new FoodVisionError('Your Anthropic API key was rejected. Check it in Settings.');
    }
    if (e instanceof Anthropic.RateLimitError) {
      throw new FoodVisionError('Rate limited. Wait a minute and try again.');
    }
    if (e instanceof Anthropic.APIConnectionError) {
      throw new FoodVisionError('No connection to the Anthropic API. Check your internet.');
    }
    if (e instanceof Anthropic.APIError) {
      throw new FoodVisionError(`Anthropic API error ${e.status ?? ''}: ${e.message}`);
    }
    throw new FoodVisionError(e instanceof Error ? e.message : 'Unknown error');
  }
}

export function totals(items: FoodAnalysis['items']) {
  return items.reduce(
    (t, i) => ({
      kcal: t.kcal + i.kcal,
      proteinG: t.proteinG + i.protein_g,
      carbsG: t.carbsG + i.carbs_g,
      fatG: t.fatG + i.fat_g,
      fiberG: t.fiberG + i.fiber_g,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
  );
}
