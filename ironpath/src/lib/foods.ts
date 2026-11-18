// Quick-add foods: cheap, athlete-friendly staples with typical values per serving.
// Approximate; brands vary. Edit the numbers before saving if your label says otherwise.

export interface QuickFood {
  name: string;
  serving: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  tag: 'carb' | 'protein' | 'recovery' | 'fuel' | 'snack' | 'meal';
}

export const QUICK_FOODS: QuickFood[] = [
  { name: 'Oatmeal', serving: '1 cup cooked', kcal: 165, proteinG: 6, carbsG: 28, fatG: 3.5, tag: 'carb' },
  { name: 'Banana', serving: '1 medium', kcal: 105, proteinG: 1.3, carbsG: 27, fatG: 0.4, tag: 'carb' },
  { name: 'Bagel', serving: '1 plain', kcal: 270, proteinG: 10, carbsG: 53, fatG: 1.5, tag: 'carb' },
  { name: 'White rice', serving: '1 cup cooked', kcal: 205, proteinG: 4.3, carbsG: 45, fatG: 0.4, tag: 'carb' },
  { name: 'Pasta', serving: '1 cup cooked', kcal: 220, proteinG: 8, carbsG: 43, fatG: 1.3, tag: 'carb' },
  { name: 'Sweet potato', serving: '1 medium', kcal: 115, proteinG: 2, carbsG: 27, fatG: 0.1, tag: 'carb' },
  { name: 'Eggs', serving: '2 large', kcal: 145, proteinG: 12.6, carbsG: 0.8, fatG: 9.6, tag: 'protein' },
  { name: 'Greek yogurt (nonfat)', serving: '1 cup', kcal: 130, proteinG: 23, carbsG: 9, fatG: 0.7, tag: 'protein' },
  { name: 'Chicken breast', serving: '150 g cooked', kcal: 248, proteinG: 46, carbsG: 0, fatG: 5.4, tag: 'protein' },
  { name: 'Canned tuna', serving: '1 can drained', kcal: 120, proteinG: 26, carbsG: 0, fatG: 1, tag: 'protein' },
  { name: 'Salmon', serving: '150 g cooked', kcal: 310, proteinG: 33, carbsG: 0, fatG: 19, tag: 'protein' },
  { name: 'Cottage cheese', serving: '1 cup', kcal: 206, proteinG: 28, carbsG: 8, fatG: 9, tag: 'protein' },
  { name: 'Lentils', serving: '1 cup cooked', kcal: 230, proteinG: 18, carbsG: 40, fatG: 0.8, tag: 'protein' },
  { name: 'Whey protein shake', serving: '1 scoop + water', kcal: 120, proteinG: 24, carbsG: 3, fatG: 1.5, tag: 'recovery' },
  { name: 'Chocolate milk', serving: '16 oz / 475 mL', kcal: 380, proteinG: 16, carbsG: 60, fatG: 9, tag: 'recovery' },
  { name: 'Energy gel', serving: '1 gel', kcal: 100, proteinG: 0, carbsG: 25, fatG: 0, tag: 'fuel' },
  { name: 'Sports drink', serving: '500 mL bottle', kcal: 140, proteinG: 0, carbsG: 35, fatG: 0, tag: 'fuel' },
  { name: 'Energy chews', serving: '1 sleeve', kcal: 160, proteinG: 0, carbsG: 40, fatG: 0, tag: 'fuel' },
  { name: 'PB & J sandwich', serving: '1 sandwich', kcal: 380, proteinG: 13, carbsG: 50, fatG: 15, tag: 'snack' },
  { name: 'Peanut butter', serving: '2 tbsp', kcal: 190, proteinG: 7, carbsG: 7, fatG: 16, tag: 'snack' },
  { name: 'Mixed nuts', serving: '1 oz / 28 g', kcal: 170, proteinG: 5, carbsG: 6, fatG: 15, tag: 'snack' },
  { name: 'Apple', serving: '1 medium', kcal: 95, proteinG: 0.5, carbsG: 25, fatG: 0.3, tag: 'snack' },
  { name: 'Granola bar', serving: '1 bar', kcal: 190, proteinG: 4, carbsG: 29, fatG: 7, tag: 'snack' },
  { name: 'Burrito bowl', serving: '1 bowl (rice, chicken, beans)', kcal: 750, proteinG: 45, carbsG: 85, fatG: 24, tag: 'meal' },
  { name: 'Pizza', serving: '2 slices', kcal: 570, proteinG: 24, carbsG: 70, fatG: 21, tag: 'meal' },
];
