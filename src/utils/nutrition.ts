import type { ActivityLevel, Goal, MacroTargets, MealEntry, PhysicalEntry, UserProfile } from "../types";

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function round(value: number) {
  return Math.round(value);
}

export function calculateTargets(profile: UserProfile): MacroTargets {
  // Formule Mifflin-St Jeor : simple, fiable et suffisante pour un MVP.
  const sexOffset = profile.sex === "Homme" ? 5 : -161;
  const bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset;
  const activityFactor = getActivityFactor(profile.activityLevel, profile.workoutsPerWeek);
  const maintenanceCalories = bmr * activityFactor;
  const estimatedBodyFatPercent = getBodyFatPercent(profile);
  const fatMassKg = profile.weightKg * (estimatedBodyFatPercent / 100);
  const leanMassKg = profile.weightKg - fatMassKg;
  const calorieAdjustment = getCalorieAdjustment(profile.goal, maintenanceCalories);
  const targetCalories = maintenanceCalories + calorieAdjustment;
  // Les protéines et lipides sont fixés d’abord, puis les glucides complètent les calories restantes.
  const proteinG = profile.weightKg * getProteinMultiplier(profile.goal);
  const fatG = Math.max(profile.weightKg * 0.75, targetCalories * 0.2 / 9);
  const carbsG = Math.max((targetCalories - proteinG * 4 - fatG * 9) / 4, 0);
  const goalProgressPercent = getGoalProgressPercent(profile.goal, targetCalories, maintenanceCalories);

  return {
    bmr: round(bmr),
    maintenanceCalories: round(maintenanceCalories),
    targetCalories: round(targetCalories),
    proteinG: round(proteinG),
    carbsG: round(carbsG),
    fatG: round(fatG),
    fatMassKg: Math.round(fatMassKg * 10) / 10,
    leanMassKg: Math.round(leanMassKg * 10) / 10,
    estimatedBodyFatPercent: Math.round(estimatedBodyFatPercent * 10) / 10,
    goalProgressPercent,
    calorieAdjustment: round(calorieAdjustment),
    coachMessage: getCoachMessage(profile.goal, calorieAdjustment, proteinG),
    coachMessageKey: getCoachMessageKey(profile.goal),
    coachMessageValues: {
      calories: Math.abs(round(calorieAdjustment)),
      protein: round(proteinG),
    },
  };
}

function getActivityFactor(activityLevel: ActivityLevel = "Actif", workoutsPerWeek: number) {
  const baseFactors: Record<ActivityLevel, number> = {
    Sédentaire: 1.2,
    "Légèrement actif": 1.375,
    Actif: 1.55,
    "Très actif": 1.725,
  };
  const trainingBonus = Math.min(Math.max(workoutsPerWeek - 3, 0), 4) * 0.03;
  return baseFactors[activityLevel] + trainingBonus;
}

function getCalorieAdjustment(goal: Goal, maintenanceCalories: number) {
  const adjustments: Record<Goal, number> = {
    "Perte de graisse": -maintenanceCalories * 0.18,
    "Masse sèche / recomposition": -maintenanceCalories * 0.05,
    "Prise de masse": maintenanceCalories * 0.1,
    Maintien: 0,
  };

  return adjustments[goal];
}

function getProteinMultiplier(goal: Goal) {
  const multipliers: Record<Goal, number> = {
    "Perte de graisse": 2.1,
    "Masse sèche / recomposition": 2.2,
    "Prise de masse": 1.9,
    Maintien: 1.7,
  };

  return multipliers[goal];
}

function getBodyFatPercent(profile: UserProfile) {
  if (profile.bodyFatPercent && profile.bodyFatPercent > 3 && profile.bodyFatPercent < 70) {
    return profile.bodyFatPercent;
  }

  const heightM = profile.heightCm / 100;
  const bmi = profile.weightKg / (heightM * heightM);
  const sexValue = profile.sex === "Homme" ? 1 : 0;
  const estimate = 1.2 * bmi + 0.23 * profile.age - 10.8 * sexValue - 5.4;
  return Math.min(Math.max(estimate, 8), 45);
}

function getGoalProgressPercent(goal: Goal, targetCalories: number, maintenanceCalories: number) {
  if (goal === "Maintien") return 100;

  const difference = targetCalories - maintenanceCalories;
  const reference = goal === "Prise de masse" ? maintenanceCalories * 0.15 : maintenanceCalories * 0.22;
  return Math.min(Math.round((Math.abs(difference) / reference) * 100), 100);
}

function getCoachMessage(goal: Goal, calorieAdjustment: number, proteinG: number) {
  const calories = Math.abs(round(calorieAdjustment));
  const protein = round(proteinG);

  if (goal === "Perte de graisse") {
    return `Déficit modéré de ${calories} kcal : vise ${protein} g de protéines pour perdre du gras sans sacrifier la masse maigre.`;
  }

  if (goal === "Masse sèche / recomposition") {
    return `Recomposition active : calories proches du maintien et protéines hautes (${protein} g) pour construire du muscle proprement.`;
  }

  if (goal === "Prise de masse") {
    return `Surplus contrôlé de ${calories} kcal : assez d’énergie pour progresser sans prise de gras excessive.`;
  }

  return `Maintien intelligent : garde tes calories stables et surveille la régularité de tes entraînements.`;
}

function getCoachMessageKey(goal: Goal) {
  if (goal === "Perte de graisse") return "fatLoss";
  if (goal === "Masse sèche / recomposition") return "recomposition";
  if (goal === "Prise de masse") return "bulk";
  return "maintenance";
}

export function sumMeals(meals: MealEntry[]) {
  return meals.reduce(
    (total, meal) => ({
      calories: total.calories + meal.calories,
      protein: total.protein + meal.protein,
      carbs: total.carbs + meal.carbs,
      fat: total.fat + meal.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function averageMeals(meals: MealEntry[]) {
  const days = new Set(meals.map((meal) => meal.date)).size || 1;
  const totals = sumMeals(meals);
  return {
    calories: totals.calories / days,
    protein: totals.protein / days,
    carbs: totals.carbs / days,
    fat: totals.fat / days,
  };
}

export function getLastDaysMeals(meals: MealEntry[], days: number) {
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  const startIso = start.toISOString().slice(0, 10);
  return meals.filter((meal) => meal.date >= startIso);
}

export function getThisMonthMeals(meals: MealEntry[]) {
  const month = todayIso().slice(0, 7);
  return meals.filter((meal) => meal.date.startsWith(month));
}

export function getWeightChange(entries: PhysicalEntry[]) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return 0;
  return sorted[sorted.length - 1].weightKg - sorted[0].weightKg;
}

export function getWaistChange(entries: PhysicalEntry[]) {
  const withWaist = entries.filter((entry) => typeof entry.waistCm === "number").sort((a, b) => a.date.localeCompare(b.date));
  if (withWaist.length < 2) return 0;
  return (withWaist[withWaist.length - 1].waistCm ?? 0) - (withWaist[0].waistCm ?? 0);
}

export function motivationMessage(consumedCalories: number, targets?: MacroTargets, consumedProtein = 0) {
  if (!targets) return "Crée ton profil pour recevoir un conseil personnalisé.";
  if (consumedProtein < targets.proteinG * 0.75) return "Aujourd’hui il manque des protéines.";
  if (consumedCalories < targets.targetCalories * 0.7) return "Attention, calories trop basses.";
  if (consumedCalories >= targets.targetCalories * 0.9 && consumedCalories <= targets.targetCalories * 1.08) {
    return "Bravo, tu es proche de ton objectif.";
  }
  return "Continue comme ça.";
}

export function motivationMessageKey(consumedCalories: number, targets?: MacroTargets, consumedProtein = 0) {
  if (!targets) return "createProfile";
  if (consumedProtein < targets.proteinG * 0.75) return "missingProtein";
  if (consumedCalories < targets.targetCalories * 0.7) return "lowCalories";
  if (consumedCalories >= targets.targetCalories * 0.9 && consumedCalories <= targets.targetCalories * 1.08) {
    return "nearGoal";
  }
  return "keepGoing";
}
