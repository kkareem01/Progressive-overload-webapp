export const DAYS = Object.freeze(['push', 'pull', 'leg']);

export const DAY_LABELS = Object.freeze({
  push: 'Push',
  pull: 'Pull',
  leg:  'Leg',
});

export const EXERCISES_BY_DAY = Object.freeze({
  leg: Object.freeze([
    'Leg Press',
    'Seated Leg Curl',
    'Leg Extension',
    'Hip Abduction',
    'Hip Adduction',
    'Standing Calf Raise',
  ]),
  push: Object.freeze([
    'Incline Bench Press',
    'Pec Deck Fly',
    'EZ Bar Front Raise',
    'Cable Lateral Raise',
    'Dumbbell Lateral Raise',
    'Overhead Tricep Extension',
    'Tricep Push Downs',
  ]),
  pull: Object.freeze([
    'Lat Pulldown',
    'Close-Grip Cable Row',
    'Dumbbell Shrugs',
    'Deficit Pendlay Rows',
    'Pull-Up',
    'Incline Dumbbell Curl',
    'Bayesian Cable Curl',
    '45° Preacher Hammer Curl',
    'Reverse Pec Deck',
  ]),
});

export const ALL_EXERCISES = Object.freeze(
  Object.values(EXERCISES_BY_DAY).flat()
);

export const EXERCISE_TO_DAY = Object.freeze(
  Object.fromEntries(
    Object.entries(EXERCISES_BY_DAY).flatMap(
      ([day, list]) => list.map((name) => [name, day])
    )
  )
);

export function isValidExercise(name) {
  return EXERCISE_TO_DAY[name] !== undefined;
}
