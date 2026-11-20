export const PREDEFINED_CATEGORIES = [
  'Food & Drinks',
  'Transport',
  'Accommodation',
  'Activities & Tours',
  'Shopping',
  'Groceries',
  'Utilities',
  'Entertainment',
  'Others',
] as const;

export type PredefinedCategory = typeof PREDEFINED_CATEGORIES[number];
