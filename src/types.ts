export type Goal = "Perte de graisse" | "Masse sèche / recomposition" | "Prise de masse" | "Maintien";
export type Level = "Débutant" | "Intermédiaire" | "Avancé";
export type ActivityLevel = "Sédentaire" | "Légèrement actif" | "Actif" | "Très actif";
export type Sex = "Homme" | "Femme";
export type MealMoment = "Petit-déjeuner" | "Déjeuner" | "Dîner" | "Collation";

export interface UserProfile {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  bodyFatPercent?: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  workoutsPerWeek: number;
  level: Level;
}

export interface MacroTargets {
  bmr: number;
  maintenanceCalories: number;
  targetCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fatMassKg: number;
  leanMassKg: number;
  estimatedBodyFatPercent: number;
  goalProgressPercent: number;
  calorieAdjustment: number;
  coachMessage: string;
  coachMessageKey: "fatLoss" | "recomposition" | "bulk" | "maintenance";
  coachMessageValues: {
    calories: number;
    protein: number;
  };
}

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealEntry {
  id: string;
  date: string;
  foodName: string;
  grams: number;
  moment: MealMoment;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface PhysicalEntry {
  id: string;
  date: string;
  weightKg: number;
  waistCm?: number;
  chestCm?: number;
  beforePhoto?: string;
  afterPhoto?: string;
}
