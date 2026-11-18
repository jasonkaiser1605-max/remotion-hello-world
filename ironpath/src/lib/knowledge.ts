// "Learn" tab content: what a first-time Ironman athlete should know beyond the
// workouts. Facts like cutoffs vary by race, so always confirm in your race's
// athlete guide.

export interface Article {
  id: string;
  icon: string; // MaterialCommunityIcons name
  title: string;
  blurb: string;
  sections: { heading?: string; bullets: string[] }[];
}

export const ARTICLES: Article[] = [
  {
    id: 'ironman-101',
    icon: 'flag-checkered',
    title: 'Ironman 101',
    blurb: 'Distances, cutoffs, and how race day works.',
    sections: [
      {
        heading: 'The distance: 140.6 miles',
        bullets: [
          'Swim 2.4 mi (3.86 km) → Bike 112 mi (180 km) → Run 26.2 mi (42.2 km).',
          'Most first-timers finish in 12–16 hours. The goal for year one is to finish strong and happy.',
        ],
      },
      {
        heading: 'Typical cutoffs (check your race’s athlete guide)',
        bullets: [
          'Swim: ~2 h 20 min.',
          'Bike: off the bike ~10 h 30 min after your start.',
          'Finish: 17 hours total. Many races also have intermediate bike/run checkpoints.',
          'A weak swimmer’s biggest risk is the swim cutoff, which is why your plan has 3 swims a week from day one. Most beginners who swim consistently for a year make it comfortably.',
        ],
      },
      {
        heading: 'Race day flow',
        bullets: [
          'Check-in and bike/gear-bag drop are usually the day before. Plan to arrive 2–3 days early.',
          'T1 (swim→bike) and T2 (bike→run) happen in a changing tent with gear bags, so practise packing them.',
          'Aid stations every ~10 mi on the bike and ~1 mi on the run. Learn which gel and drink brands your race serves and train with them.',
        ],
      },
    ],
  },
  {
    id: 'your-plan',
    icon: 'map-marker-path',
    title: 'How your plan works',
    blurb: 'Phases, recovery weeks, and why easy means easy.',
    sections: [
      {
        heading: 'Phases',
        bullets: [
          'Foundation (~12 wks): swim technique 3×/week, easy aerobic riding and running, strength 2×. About 5–7 h/week.',
          'Base (~12 wks): longer rides and runs, first bricks, swim endurance. Ends with a sprint/Olympic tune-up race.',
          'Build (~12 wks): threshold intervals, open water, 3-hour rides. Ends with a 70.3 (half Ironman) as a dress rehearsal.',
          'Ironman-specific (~13 wks): 4–5 h rides, 2–2.5 h runs, race-nutrition rehearsals. Peak ~12–13 h/week.',
          'Taper (2 wks) + race week: volume drops, intensity stays, sleep goes up.',
        ],
      },
      {
        heading: 'Rules that keep beginners healthy',
        bullets: [
          'Every 4th week is a recovery week (~35% less). Don’t "catch up" in it.',
          '80% of training should be easy (Zone 1–2). If you can’t talk, you’re going too hard.',
          'Missed a session? Let it go. Never cram two days into one.',
          'Exam week or work crunch? Tap "Busy week" on the Plan tab and the week shrinks ~40% while the key sessions stay.',
        ],
      },
    ],
  },
  {
    id: 'swim',
    icon: 'swim',
    title: 'Becoming a swimmer',
    blurb: 'The fastest way to fix your weakest sport.',
    sections: [
      {
        bullets: [
          'Frequency beats distance: three 30-minute swims beat one 90-minute swim while you’re learning.',
          'Get eyes on your stroke: 2–4 lessons with a coach, or join a Masters swim group (often cheap at universities). This is the best money you’ll spend all year.',
          'Have a friend film you underwater once a month and compare.',
          'Breathe every 3 strokes (both sides). Open water is easier when you can breathe away from waves and sun.',
          'Exhale fully underwater. Holding your breath is the #1 cause of "I’m out of air after 50 m".',
          'Do the CSS test (400 m + 200 m) every 8 weeks. Enter the times in Settings and your swim paces update.',
          'Wetsuit: most Ironman swims are wetsuit-legal (water ≤ ~24.5 °C / 76 °F). A wetsuit adds a lot of buoyancy, so practise in it at least 6–8 times before race day.',
        ],
      },
      {
        heading: 'Open water',
        bullets: [
          'Start open water sessions in late spring (Build phase). Never swim alone; use a bright tow float.',
          'Practise sighting (lift your eyes every 6–8 strokes), swimming straight, and starting in a crowd.',
          'On race day, seed yourself honestly in the rolling start and swim your own pace.',
        ],
      },
    ],
  },
  {
    id: 'race-choice',
    icon: 'calendar-star',
    title: 'Choosing & registering for your race',
    blurb: 'Pick a first-timer-friendly race, then book it.',
    sections: [
      {
        bullets: [
          'Popular full-distance races can sell out, often close to a year ahead. Register as soon as you choose.',
          'First-timer friendly: wetsuit-legal water, moderate temperatures, not super hilly, close to home or easy travel.',
          'Use the standard 17-hour cutoff. Avoid non-branded races with tighter limits for your first one.',
          'Book your 70.3 (half) for ~12–16 weeks before your Ironman, and a sprint/Olympic in spring to learn transitions.',
          'Set the race name and date in Settings and the whole plan re-shapes around it.',
          'Budget for entry, travel, lodging, a wetsuit, a bike fit and a basic bike service.',
        ],
      },
    ],
  },
  {
    id: 'fuel',
    icon: 'food-apple',
    title: 'Fueling 101',
    blurb: 'What to eat, when, and how much.',
    sections: [
      {
        heading: 'Every day',
        bullets: [
          'Protein ~1.6–2.0 g/kg spread over 4–5 meals (~25–35 g each). You’re ~71 kg, so ~125 g/day.',
          'Carbs follow your training: ~3–4 g/kg on rest days up to 8–10 g/kg on long-ride days. The Fuel tab sets this for you each day.',
          'Colour on the plate: fruit and veg at most meals for vitamins, fibre and immune health.',
          'Iron (red meat, lentils, spinach + vitamin C) and calcium/vitamin D matter for endurance athletes.',
        ],
      },
      {
        heading: 'Around training',
        bullets: [
          '1–4 h before: a carb-based meal that’s low in fat and fibre.',
          'During: nothing needed under 60 min; 30–60 g carbs/h for 1–2.5 h; 60–90 g/h for longer sessions.',
          'After: ~0.3 g/kg protein + carbs within an hour or two, especially if you train again within 24 h.',
          'Before bed: 30–40 g slow protein (Greek yogurt, cottage cheese) helps overnight repair.',
        ],
      },
      {
        heading: 'Student-budget staples',
        bullets: [
          'Oats, rice, pasta, potatoes, bagels, bananas, frozen fruit & veg, eggs, canned tuna, lentils/beans, Greek yogurt, peanut butter, milk.',
          'Chocolate milk is a cheap, effective recovery drink.',
          'Meal-prep a big batch of rice + protein + veg on Sunday for the busy weekdays.',
        ],
      },
      {
        heading: 'Race nutrition = trained skill',
        bullets: [
          'Your gut adapts. Practise 60–90 g carbs/h on every long ride from the Build phase on.',
          'Nothing new on race day: same breakfast, gels, drink and caffeine you trained with.',
          'Do the sweat-rate test (Fuel tab) in warm and cool weather to dial in fluids and sodium.',
        ],
      },
    ],
  },
  {
    id: 'hydration',
    icon: 'water',
    title: 'Hydration & sweat rate',
    blurb: 'How much to drink and how to test it.',
    sections: [
      {
        bullets: [
          'Daily baseline ~35 mL/kg (~2.5 L for you) plus what you sweat in training. The Fuel tab adds this automatically.',
          'Pale-yellow urine = good. Clear all day = probably overdoing it.',
          'Sweat-rate test: weigh yourself naked before and after a 60-min session, note what you drank. (Before − after kg) × 1000 + mL drunk = mL lost per hour.',
          'Aim to replace ~70–80% of sweat losses during long sessions, with 300–700 mg sodium per hour (more if you’re a salty sweater).',
          'Drinking far more than you sweat during long events can cause hyponatremia, which is dangerous. Drink to a plan, not to the max.',
        ],
      },
    ],
  },
  {
    id: 'soccer',
    icon: 'soccer',
    title: 'Soccer + triathlon',
    blurb: 'Keep playing without wrecking your training.',
    sections: [
      {
        bullets: [
          'Your soccer fitness (repeat sprints, strong legs) is a big head start, but triathlon is about patient aerobic pacing.',
          'Add your soccer days in Settings. The plan treats them as hard days and removes extra run intervals when you play 2+ times a week.',
          'Keep the day after a match easy (swim or spin). Ankle sprains are the biggest soccer risk to your season, so consider taping or bracing.',
          'In the last 12 weeks before the race, cut back on matches if you can. The long ride and long run matter most then.',
        ],
      },
    ],
  },
  {
    id: 'strength',
    icon: 'dumbbell',
    title: 'Lifting for triathletes',
    blurb: 'Keep lifting, but lift smart.',
    sections: [
      {
        bullets: [
          'Foundation & Base: 2× per week, heavy-ish compound lifts (squat, deadlift variations, split squats, pull-ups, rows).',
          'Build: 1–2× per week. Peak: 1× maintenance. Taper: light or none.',
          'Stack lifting on hard days (after intervals) to keep easy days easy.',
          'No heavy legs within 48 h of your long ride or long run.',
          'Prioritise single-leg work, calves/Achilles, glutes, core anti-rotation and shoulder stability (external rotations, face pulls). They prevent the classic overuse injuries.',
          'Don’t chase body mass. Every extra kilo costs you on the run.',
        ],
      },
    ],
  },
  {
    id: 'time',
    icon: 'clock-fast',
    title: 'Training as a student who works',
    blurb: 'Fitting 6–13 h/week into a busy life.',
    sections: [
      {
        bullets: [
          'Set your real available minutes per day in Settings. The plan fits around them and tells you if a phase needs more.',
          'Weekdays: short, high-value sessions (≤ 60–90 min). Weekends: the long ride and long run.',
          'Swim at the campus pool between classes; use an indoor trainer for weekday bike work (no daylight or traffic needed).',
          'Commute by bike when you can. Easy riding still counts.',
          'Mark exam/finals weeks as Busy. Recovery happens anyway; planning it is smarter than burning out.',
          'Sleep is training: 8+ hours whenever possible. It’s the cheapest performance enhancer there is.',
        ],
      },
    ],
  },
  {
    id: 'gear',
    icon: 'bag-personal',
    title: 'Gear checklist',
    blurb: 'What you need now vs later.',
    sections: [
      {
        heading: 'Now',
        bullets: [
          'Goggles (2 pairs), swim cap, pull buoy, fins, kickboard.',
          'Any road bike in good shape + helmet. Get a professional bike fit before the long rides start (Base phase). It prevents back, knee and neck pain.',
          'Indoor trainer (smart trainer if budget allows) for efficient weekday sessions.',
          'Two pairs of running shoes to rotate; a chest-strap HR monitor (more accurate than wrist HR for swim and bike).',
        ],
      },
      {
        heading: 'By Build phase',
        bullets: [
          'Triathlon wetsuit (renting is fine for year one), tri suit, race belt, elastic laces.',
          'Bike: clip-in pedals & shoes, two bottle cages, saddle bag with tube, levers and CO₂/pump. Know how to fix a flat.',
          'Optional: clip-on aero bars, but only after a bike fit and plenty of practice.',
          'Body Glide/anti-chafe, sunscreen, a GPS watch with multisport mode (your Garmin or Apple Watch both work).',
        ],
      },
    ],
  },
  {
    id: 'recovery',
    icon: 'bed',
    title: 'Recovery, sleep & warning signs',
    blurb: 'How to read your readiness score.',
    sections: [
      {
        bullets: [
          'Readiness combines HRV and resting HR (vs your own 30–60 day baseline), sleep, recent training load and your morning check-in.',
          'Green: train as planned. Yellow: keep intensity low, cut intervals by a third. Red: rest or 20–30 min very easy.',
          'Warning signs of overreaching: resting HR up 5+ bpm for several days, HRV down for a week, poor sleep, irritability, heavy legs that don’t recover, getting sick often.',
          'Pain that changes how you move (limping, sharp pain, swelling) means stop and get it checked. Don’t train through it.',
        ],
      },
    ],
  },
  {
    id: 'safety',
    icon: 'shield-check',
    title: 'Health & safety first',
    blurb: 'Before you ramp up.',
    sections: [
      {
        bullets: [
          'Get a sports physical before a year of endurance training. Ask your doctor whether an ECG makes sense for you.',
          'Never swim open water alone. Ride with lights day and night, and tell someone your route on long rides.',
          'Heat: train early in summer, increase fluids and sodium, and back off when it’s extremely hot.',
          'This app gives general training guidance, not medical advice. If something feels wrong, listen to your body and a professional.',
        ],
      },
    ],
  },
];

/** Rotating short tips for the Today screen. */
export const DAILY_TIPS = [
  'Easy days easy, hard days hard. Most beginner mistakes happen in the middle.',
  'Three short swims beat one long one while you’re learning technique.',
  'Practise eating on every ride over 75 minutes. Race nutrition is a skill.',
  'Sleep is when the adaptation happens. Protect it during exam season.',
  'Missed a workout? Move on. Never double up to catch up.',
  'Exhale underwater, all the way. It makes breathing in easy.',
  'Run cadence ~170–180 steps/min reduces impact and injury risk.',
  'Your 70.3 is a dress rehearsal: same breakfast, kit, gels and pacing as Ironman day.',
  'Book a bike fit before your rides go over 2 hours.',
  'Recovery weeks are part of the plan, not a break from it.',
  'Chocolate milk after a hard session: carbs + protein + fluid, cheap.',
  'Consistency over heroics: 52 good weeks beat 5 great ones.',
];
