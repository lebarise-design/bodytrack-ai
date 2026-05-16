import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import {
  Activity,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  Dumbbell,
  Flame,
  Gauge,
  Home,
  Moon,
  Plus,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { foods } from "./data/foods";
import { supportedLanguages, type SupportedLanguage } from "./i18n";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import type { ActivityLevel, Food, Goal, Level, MealEntry, MealMoment, PhysicalEntry, Sex, UserProfile } from "./types";
import {
  averageMeals,
  calculateTargets,
  getLastDaysMeals,
  getThisMonthMeals,
  getWaistChange,
  getWeightChange,
  motivationMessageKey,
  round,
  sumMeals,
  todayIso,
} from "./utils/nutrition";
import { loadFromStorage, saveToStorage } from "./utils/storage";

type Page =
  | "Accueil"
  | "Profil"
  | "Ajouter repas"
  | "Journal du jour"
  | "Suivi physique"
  | "Rapport semaine"
  | "Rapport mois"
  | "Planning annuel";

const pages: { label: Page; i18nKey: string; icon: typeof Home }[] = [
  { label: "Accueil", i18nKey: "nav.home", icon: Home },
  { label: "Profil", i18nKey: "nav.profile", icon: User },
  { label: "Ajouter repas", i18nKey: "nav.addMeal", icon: Plus },
  { label: "Journal du jour", i18nKey: "nav.dailyJournal", icon: ClipboardList },
  { label: "Suivi physique", i18nKey: "nav.physicalTracking", icon: Scale },
  { label: "Rapport semaine", i18nKey: "nav.weeklyReport", icon: Activity },
  { label: "Rapport mois", i18nKey: "nav.monthlyReport", icon: ChartNoAxesColumnIncreasing },
  { label: "Planning annuel", i18nKey: "nav.yearPlanning", icon: CalendarDays },
];

const defaultProfile: UserProfile = {
  name: "",
  age: 30,
  sex: "Homme",
  heightCm: 175,
  weightKg: 75,
  activityLevel: "Actif",
  goal: "Perte de graisse",
  workoutsPerWeek: 3,
  level: "Débutant",
};

const moments: MealMoment[] = ["Petit-déjeuner", "Déjeuner", "Dîner", "Collation"];
const goals: Goal[] = ["Perte de graisse", "Masse sèche / recomposition", "Prise de masse", "Maintien"];
const levels: Level[] = ["Débutant", "Intermédiaire", "Avancé"];
const sexes: Sex[] = ["Homme", "Femme"];
const activityLevels: ActivityLevel[] = ["Sédentaire", "Légèrement actif", "Actif", "Très actif"];

function App() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState<Page>("Accueil");
  const [darkMode, setDarkMode] = useState(() => loadFromStorage("bodytrack-dark-mode", false));
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(() => normalizeProfile(loadFromStorage("bodytrack-profile", defaultProfile)));
  const [meals, setMeals] = useState<MealEntry[]>(() => loadFromStorage("bodytrack-meals", []));
  const [physicalEntries, setPhysicalEntries] = useState<PhysicalEntry[]>(() =>
    loadFromStorage("bodytrack-physical", []),
  );

  const targets = useMemo(() => calculateTargets(profile), [profile]);
  const todaysMeals = useMemo(() => meals.filter((meal) => meal.date === todayIso()), [meals]);
  const todaysTotals = useMemo(() => sumMeals(todaysMeals), [todaysMeals]);
  const coachMessageKey = motivationMessageKey(todaysTotals.calories, targets, todaysTotals.protein);
  const coachMessage = t(`coach.motivation.${coachMessageKey}`);

  useEffect(() => saveToStorage("bodytrack-profile", profile), [profile]);
  useEffect(() => saveToStorage("bodytrack-meals", meals), [meals]);
  useEffect(() => saveToStorage("bodytrack-physical", physicalEntries), [physicalEntries]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    saveToStorage("bodytrack-dark-mode", darkMode);
  }, [darkMode]);
  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch(() => {
        setSession(null);
      })
      .finally(() => {
        setIsAuthLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAuthLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase?.auth.signOut();
  }

  if (isAuthLoading) {
    return <AppShell darkMode={darkMode} setDarkMode={setDarkMode}><LoadingScreen /></AppShell>;
  }

  if (!session?.user) {
    return (
      <AppShell darkMode={darkMode} setDarkMode={setDarkMode}>
        <AuthScreen />
      </AppShell>
    );
  }

  return (
    <AppShell darkMode={darkMode} setDarkMode={setDarkMode} user={session.user} onLogout={logout}>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[260px_1fr]">
        <nav className="surface-card no-scrollbar sticky top-24 h-fit p-2 max-lg:static max-lg:flex max-lg:overflow-x-auto">
          {pages.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === page;
            return (
              <button
                key={item.label}
                onClick={() => setPage(item.label)}
                className={`mb-1 flex w-full min-w-fit items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition duration-200 max-lg:mb-0 ${
                  isActive
                    ? "bg-gradient-to-r from-mint to-lime-400 text-white shadow-lg shadow-emerald-500/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                <Icon size={18} />
                {t(item.i18nKey)}
              </button>
            );
          })}
        </nav>

        <main className="animate-fade-in">
          {page === "Accueil" && (
            <Dashboard
              totals={todaysTotals}
              targets={targets}
              message={coachMessage}
              locale={getDateLocale(i18n.language)}
              meals={meals}
              onGoToMeal={() => setPage("Ajouter repas")}
            />
          )}
          {page === "Profil" && <ProfileForm profile={profile} onChange={setProfile} />}
          {page === "Ajouter repas" && <MealForm onAdd={(meal) => setMeals([meal, ...meals])} />}
          {page === "Journal du jour" && <DailyJournal meals={todaysMeals} totals={todaysTotals} targets={targets} />}
          {page === "Suivi physique" && (
            <PhysicalTracking entries={physicalEntries} onAdd={(entry) => setPhysicalEntries([entry, ...physicalEntries])} />
          )}
          {page === "Rapport semaine" && <WeeklyReport meals={meals} physicalEntries={physicalEntries} />}
          {page === "Rapport mois" && <MonthlyReport meals={meals} physicalEntries={physicalEntries} targets={targets} />}
          {page === "Planning annuel" && <YearPlanning meals={meals} physicalEntries={physicalEntries} />}
        </main>
      </div>
    </AppShell>
  );
}

function AppShell({
  darkMode,
  setDarkMode,
  user,
  onLogout,
  children,
}: {
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  user?: SupabaseUser;
  onLogout?: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-app text-ink transition-colors duration-300 dark:text-white">
      <header className="app-header sticky top-0 z-20 border-b backdrop-blur-xl transition-colors duration-300">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-lime-400 text-white shadow-lg shadow-emerald-500/25">
                <Dumbbell size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">BodyTrack AI</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("app.tagline")}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden max-w-[240px] truncate rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300 sm:block">
                {user.email}
              </div>
            )}
            <LanguageSelector />
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              aria-label={t("theme.toggle")}
            >
              {darkMode ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            {user && (
              <button
                onClick={onLogout}
                className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-200 sm:px-4"
              >
                {t("auth.logout")}
              </button>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function normalizeProfile(profile: UserProfile): UserProfile {
  const legacyGoal = profile.goal as Goal | "Prise de masse sèche";

  return {
    ...defaultProfile,
    ...profile,
    activityLevel: profile.activityLevel ?? defaultProfile.activityLevel,
    goal: legacyGoal === "Prise de masse sèche" ? "Masse sèche / recomposition" : profile.goal,
  };
}

function getDateLocale(language: string) {
  const locales: Record<string, string> = {
    fr: "fr-FR",
    en: "en-US",
    nl: "nl-NL",
    es: "es-ES",
  };

  return locales[language] ?? "fr-FR";
}

function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const currentLanguage = (i18n.language.split("-")[0] || "fr") as SupportedLanguage;
  const flags: Record<SupportedLanguage, string> = {
    fr: "FR",
    en: "EN",
    nl: "NL",
    es: "ES",
  };

  function changeLanguage(language: SupportedLanguage) {
    void i18n.changeLanguage(language);
  }

  return (
    <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 text-sm font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
      <span className="sr-only">{t("language.label")}</span>
      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs dark:bg-white/10">{flags[currentLanguage]}</span>
      <select
        value={currentLanguage}
        onChange={(event) => changeLanguage(event.target.value as SupportedLanguage)}
        className="bg-transparent text-sm outline-none"
      >
        {supportedLanguages.map((language) => (
          <option key={language} value={language}>
            {language.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}

function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-10 sm:px-6">
      <div className="surface-card p-6 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
        <p className="font-bold">{t("auth.loading")}</p>
      </div>
    </main>
  );
}

function AuthScreen() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!supabase || !isSupabaseConfigured) {
      setError(t("auth.missingConfig"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

        if (signUpError && !data.user) {
          setError(getAuthErrorMessage(signUpError, t));
          return;
        }

        setMessage(t("auth.checkEmail"));
        return;
      }

      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

      if (loginError) {
        setError(getAuthErrorMessage(loginError, t));
      }
    } catch (authError) {
      if (mode === "signup") {
        setMessage(t("auth.checkEmail"));
      } else {
        setError(getAuthErrorMessage(authError, t));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function getAuthErrorMessage(error: unknown, t: (key: string) => string) {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    if (normalized.includes("failed to fetch") || normalized.includes("network") || normalized.includes("fetch")) {
      return t("auth.networkError");
    }

    if (normalized.includes("invalid login credentials")) {
      return t("auth.invalidCredentials");
    }

    if (normalized.includes("email not confirmed")) {
      setMessage(t("auth.checkEmail"));
      return t("auth.emailNotConfirmed");
    }

    return message || t("auth.genericError");
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-82px)] max-w-7xl items-center gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hero-card overflow-hidden p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold text-white ring-1 ring-white/20">
            <ShieldCheck size={17} />
            {t("auth.secureAccess")}
          </div>
          <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">{t("auth.title")}</h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50/90">{t("auth.subtitle")}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <SmallStat label={t("auth.benefitProfile")} value={t("auth.benefitProfileValue")} />
            <SmallStat label={t("auth.benefitPrivacy")} value={t("auth.benefitPrivacyValue")} />
            <SmallStat label={t("auth.benefitLocal")} value={t("auth.benefitLocalValue")} />
          </div>
        </div>
      </section>

      <section className="surface-card p-5 sm:p-6">
        <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-white/10">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
              mode === "login" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-950 dark:text-emerald-300" : "text-slate-500 dark:text-slate-300"
            }`}
          >
            {t("auth.login")}
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
              mode === "signup" ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-950 dark:text-emerald-300" : "text-slate-500 dark:text-slate-300"
            }`}
          >
            {t("auth.signup")}
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <h3 className="text-2xl font-black">{mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {mode === "login" ? t("auth.loginSubtitle") : t("auth.signupSubtitle")}
            </p>
          </div>

          <Field label={t("auth.email")}>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input" required />
          </Field>
          <Field label={t("auth.password")}>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="input" minLength={6} required />
          </Field>

          {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-700 dark:text-red-300">{error}</div>}
          {message && <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">{message}</div>}

          {!isSupabaseConfigured && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
              {t("auth.missingConfig")}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !isSupabaseConfigured}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-mint to-lime-400 px-4 py-3 font-black text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {isSubmitting ? t("auth.submitting") : mode === "login" ? t("auth.login") : t("auth.signup")}
          </button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({
  totals,
  targets,
  message,
  meals,
  locale,
  onGoToMeal,
}: {
  totals: ReturnType<typeof sumMeals>;
  targets: ReturnType<typeof calculateTargets>;
  message: string;
  meals: MealEntry[];
  locale: string;
  onGoToMeal: () => void;
}) {
  const { t } = useTranslation();
  const caloriePercent = Math.min((totals.calories / targets.targetCalories) * 100, 100);
  const proteinPercent = Math.min((totals.protein / targets.proteinG) * 100, 100);
  const carbsPercent = Math.min((totals.carbs / targets.carbsG) * 100, 100);
  const fatPercent = Math.min((totals.fat / targets.fatG) * 100, 100);
  const coachGoalMessage = t(`coach.goal.${targets.coachMessageKey}`, targets.coachMessageValues);
  const consumedMacros = round(totals.protein + totals.carbs + totals.fat);
  const remainingCalories = Math.max(targets.targetCalories - totals.calories, 0);

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="hero-card premium-hero overflow-hidden p-5 sm:p-7">
        <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_250px] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-50 ring-1 ring-white/20">
              <Sparkles size={15} />
              {t("dashboard.eyebrow")}
            </div>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">{t("dashboard.title")}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
              {t("dashboard.subtitle", { date: new Date().toLocaleDateString(locale) })}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <HeroMetric label={t("dashboard.consumedToday")} value={`${round(totals.calories)}`} unit={t("common.kcal")} />
              <HeroMetric label={t("dashboard.remainingToday")} value={`${round(remainingCalories)}`} unit={t("common.kcal")} />
              <HeroMetric label={t("dashboard.macroLogged")} value={`${consumedMacros}`} unit={t("common.grams")} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={onGoToMeal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 font-bold text-emerald-700 shadow-lg shadow-black/10 transition hover:-translate-y-0.5">
                <Plus size={18} />
                {t("dashboard.addMeal")}
              </button>
            </div>
          </div>
          <div className="justify-self-center">
            <CircularProgress percent={caloriePercent} value={round(totals.calories)} label="kcal" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MacroCard label={t("common.calories")} value={round(totals.calories)} target={targets.targetCalories} unit={t("common.kcal")} tone="emerald" icon={<Flame size={19} />} />
        <MacroCard label={t("common.protein")} value={round(totals.protein)} target={targets.proteinG} unit={t("common.grams")} tone="sky" icon={<Dumbbell size={19} />} />
        <MacroCard label={t("common.carbs")} value={round(totals.carbs)} target={targets.carbsG} unit={t("common.grams")} tone="amber" icon={<Zap size={19} />} />
        <MacroCard label={t("common.fat")} value={round(totals.fat)} target={targets.fatG} unit={t("common.grams")} tone="rose" icon={<Target size={19} />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="surface-card p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold">{t("dashboard.chartsTitle")}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t("dashboard.chartsSubtitle")}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
              <TrendingUp size={14} />
              {t("dashboard.proteinProgress", { value: round(proteinPercent) })}
            </span>
          </div>
          <WeeklyMacroChart meals={meals} targets={targets} locale={locale} />
        </div>

        <div className="grid gap-4">
          <CoachCard message={message} coachGoalMessage={coachGoalMessage} />
          <CurrentGoalCard
            targets={targets}
            caloriePercent={caloriePercent}
            proteinPercent={proteinPercent}
            carbsPercent={carbsPercent}
            fatPercent={fatPercent}
          />
        </div>
      </div>
    </section>
  );
}

function HeroMetric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl bg-white/14 p-4 ring-1 ring-white/20 backdrop-blur-md">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-50/80">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">
        {value} <span className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-50/80">{unit}</span>
      </p>
    </div>
  );
}

function CoachCard({ message, coachGoalMessage }: { message: string; coachGoalMessage: string }) {
  const { t } = useTranslation();

  return (
    <div className="surface-card overflow-hidden p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-400 text-white shadow-lg shadow-emerald-500/20">
          <Sparkles size={22} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">{t("dashboard.coachToday")}</p>
          <h3 className="mt-1 text-xl font-black">{t("dashboard.coachTitle")}</h3>
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-slate-700 dark:text-slate-300">{coachGoalMessage}</p>
      <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
          <Zap size={16} />
          {message}
        </p>
      </div>
    </div>
  );
}

function CurrentGoalCard({
  targets,
  caloriePercent,
  proteinPercent,
  carbsPercent,
  fatPercent,
}: {
  targets: ReturnType<typeof calculateTargets>;
  caloriePercent: number;
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="surface-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t("dashboard.currentGoal")}</p>
          <h3 className="mt-1 text-xl font-black">{t("dashboard.calculatedTargets")}</h3>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-emerald-600 dark:bg-white/10 dark:text-emerald-300">
          <Gauge size={21} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <SmallStat label={t("dashboard.bmr")} value={`${targets.bmr} ${t("common.kcal")}`} />
        <SmallStat label={t("dashboard.maintenance")} value={`${targets.maintenanceCalories} ${t("common.kcal")}`} />
      </div>

      <GoalProgress targets={targets} />

      <div className="mt-5 space-y-3">
        <TargetRow label={t("common.calories")} value={targets.targetCalories} unit={t("common.kcal")} percent={caloriePercent} />
        <TargetRow label={t("common.protein")} value={targets.proteinG} unit={t("common.grams")} percent={proteinPercent} />
        <TargetRow label={t("common.carbs")} value={targets.carbsG} unit={t("common.grams")} percent={carbsPercent} />
        <TargetRow label={t("common.fat")} value={targets.fatG} unit={t("common.grams")} percent={fatPercent} />
      </div>
    </div>
  );
}

function TargetRow({ label, value, unit, percent }: { label: string; value: number; unit: string; percent: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-black">{value} {unit}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-700" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function MacroCard({
  label,
  value,
  target,
  unit,
  tone,
  icon,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  tone: "emerald" | "sky" | "amber" | "rose";
  icon: ReactNode;
}) {
  const { t } = useTranslation();
  const percent = Math.min((value / target) * 100, 100);
  const remaining = Math.max(target - value, 0);
  const tones = {
    emerald: "from-emerald-500 to-lime-400 text-emerald-600 bg-emerald-500/10",
    sky: "from-sky-500 to-cyan-400 text-sky-600 bg-sky-500/10",
    amber: "from-amber-500 to-orange-400 text-amber-600 bg-amber-500/10",
    rose: "from-rose-500 to-coral text-rose-600 bg-rose-500/10",
  };

  return (
    <div className="surface-card group p-5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone].split(" ").slice(2).join(" ")} dark:bg-white/10`}>
            {icon}
          </div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold">
            {value} <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{unit}</span>
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
          {t("common.remaining", { value: round(remaining) })}
        </span>
      </div>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div className={`h-2.5 rounded-full bg-gradient-to-r ${tones[tone].split(" ").slice(0, 2).join(" ")} transition-all duration-700`} style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{t("common.target", { value: target, unit })}</span>
        <span className="font-black text-slate-700 dark:text-slate-200">{round(percent)}%</span>
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition dark:bg-white/5 dark:ring-white/10">
      <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function CircularProgress({ percent, value, label }: { percent: number; value: number; label: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="relative h-40 w-40">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-3xl font-black">{value}</span>
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-50">{label}</span>
      </div>
    </div>
  );
}

function GoalProgress({ targets }: { targets: ReturnType<typeof calculateTargets> }) {
  const { t } = useTranslation();
  const isDeficit = targets.calorieAdjustment < 0;
  const label = targets.calorieAdjustment === 0 ? t("goalProgress.maintenance") : isDeficit ? t("goalProgress.deficit") : t("goalProgress.surplus");

  return (
    <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-black">
            {targets.calorieAdjustment > 0 ? "+" : ""}
            {targets.calorieAdjustment} kcal
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-300">
          {targets.goalProgressPercent}%
        </span>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-lime-400 to-coral transition-all duration-700"
          style={{ width: `${targets.goalProgressPercent}%` }}
        />
      </div>
    </div>
  );
}

function WeeklyMacroChart({ meals, targets, locale }: { meals: MealEntry[]; targets: ReturnType<typeof calculateTargets>; locale: string }) {
  const { t } = useTranslation();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const iso = date.toISOString().slice(0, 10);
    const totals = sumMeals(meals.filter((meal) => meal.date === iso));

    return {
      label: date.toLocaleDateString(locale, { weekday: "short" }).slice(0, 3),
      calories: totals.calories,
      protein: totals.protein,
    };
  });

  return (
    <div className="mt-6">
      <div className="flex h-56 items-end gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10">
        {days.map((day) => {
          const calorieHeight = Math.max((day.calories / targets.targetCalories) * 100, day.calories ? 8 : 2);
          const proteinHeight = Math.max((day.protein / targets.proteinG) * 100, day.protein ? 8 : 2);

          return (
            <div key={day.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-40 w-full items-end justify-center gap-1.5">
                <span
                  className="w-3 rounded-t-full bg-gradient-to-t from-emerald-600 to-lime-300 transition-all duration-700"
                  style={{ height: `${Math.min(calorieHeight, 100)}%` }}
                  title={`${round(day.calories)} kcal`}
                />
                <span
                  className="w-3 rounded-t-full bg-gradient-to-t from-sky-600 to-cyan-300 transition-all duration-700"
                  style={{ height: `${Math.min(proteinHeight, 100)}%` }}
                  title={`${round(day.protein)} g protéines`}
                />
              </div>
              <span className="text-xs font-bold uppercase text-slate-400">{day.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{t("common.calories")}</span>
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-sky-500" />{t("common.protein")}</span>
      </div>
    </div>
  );
}

function ProfileForm({ profile, onChange }: { profile: UserProfile; onChange: (profile: UserProfile) => void }) {
  const { t } = useTranslation();
  const update = (field: keyof UserProfile, value: string | number | undefined) => onChange({ ...profile, [field]: value });
  const targets = calculateTargets(profile);
  const coachGoalMessage = t(`coach.goal.${targets.coachMessageKey}`, targets.coachMessageValues);

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="surface-card p-5">
        <h2 className="text-xl font-bold">{t("profile.title")}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label={t("profile.name")}><input value={profile.name} onChange={(e) => update("name", e.target.value)} className="input" /></Field>
          <Field label={t("profile.age")}><input type="number" value={profile.age} onChange={(e) => update("age", Number(e.target.value))} className="input" /></Field>
          <Field label={t("profile.sex")}><Select value={profile.sex} values={sexes} labels={optionLabels("sex", t)} onChange={(value) => update("sex", value as Sex)} /></Field>
          <Field label={t("profile.height")}><input type="number" value={profile.heightCm} onChange={(e) => update("heightCm", Number(e.target.value))} className="input" /></Field>
          <Field label={t("profile.weight")}><input type="number" value={profile.weightKg} onChange={(e) => update("weightKg", Number(e.target.value))} className="input" /></Field>
          <Field label={t("profile.bodyFat")}><input type="number" value={profile.bodyFatPercent ?? ""} onChange={(e) => update("bodyFatPercent", e.target.value ? Number(e.target.value) : undefined)} className="input" /></Field>
          <Field label={t("profile.activityLevel")}><Select value={profile.activityLevel} values={activityLevels} labels={optionLabels("activity", t)} onChange={(value) => update("activityLevel", value as ActivityLevel)} /></Field>
          <Field label={t("profile.workouts")}><input type="number" min={0} max={7} value={profile.workoutsPerWeek} onChange={(e) => update("workoutsPerWeek", Number(e.target.value))} className="input" /></Field>
          <Field label={t("profile.mainGoal")}><Select value={profile.goal} values={goals} labels={optionLabels("goal", t)} onChange={(value) => update("goal", value as Goal)} /></Field>
          <Field label={t("profile.level")}><Select value={profile.level} values={levels} labels={optionLabels("level", t)} onChange={(value) => update("level", value as Level)} /></Field>
        </div>
      </div>
      <div className="surface-card p-5">
        <h3 className="font-bold">{t("profile.smartGoal")}</h3>
        <div className="mt-4 space-y-3">
          <SmallStat label={t("dashboard.bmr")} value={`${targets.bmr} ${t("common.kcal")}`} />
          <SmallStat label={t("dashboard.maintenance")} value={`${targets.maintenanceCalories} ${t("common.kcal")}`} />
          <SmallStat label={t("common.calories")} value={t("profile.perDay", { value: targets.targetCalories, unit: t("common.kcal") })} />
          <SmallStat label={t("common.protein")} value={t("profile.perDay", { value: targets.proteinG, unit: t("common.grams") })} />
          <SmallStat label={t("common.carbs")} value={t("profile.perDay", { value: targets.carbsG, unit: t("common.grams") })} />
          <SmallStat label={t("common.fat")} value={t("profile.perDay", { value: targets.fatG, unit: t("common.grams") })} />
          <SmallStat label={t("profile.fatMass")} value={`${targets.fatMassKg} kg (${targets.estimatedBodyFatPercent}%)`} />
          <SmallStat label={t("profile.leanMass")} value={`${targets.leanMassKg} kg`} />
        </div>
        <GoalProgress targets={targets} />
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{t("profile.coachMessage")}</p>
          <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{coachGoalMessage}</p>
        </div>
      </div>
    </section>
  );
}

function MealForm({ onAdd }: { onAdd: (meal: MealEntry) => void }) {
  const { t } = useTranslation();
  const [selectedFoodId, setSelectedFoodId] = useState(foods[0].id);
  const [grams, setGrams] = useState(100);
  const [moment, setMoment] = useState<MealMoment>("Déjeuner");
  const selectedFood = foods.find((food) => food.id === selectedFoodId) ?? foods[0];
  const calculated = scaleFood(selectedFood, grams);

  function submit(event: FormEvent) {
    event.preventDefault();
    onAdd({
      id: crypto.randomUUID(),
      date: todayIso(),
      foodName: selectedFood.name,
      grams,
      moment,
      ...calculated,
    });
    setGrams(100);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <form onSubmit={submit} className="surface-card p-5">
        <h2 className="text-xl font-bold">{t("meal.title")}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label={t("meal.food")}><Select value={selectedFoodId} values={foods.map((food) => food.id)} labels={Object.fromEntries(foods.map((food) => [food.id, foodLabel(food.name, t)]))} onChange={setSelectedFoodId} /></Field>
          <Field label={t("meal.moment")}><Select value={moment} values={moments} labels={optionLabels("moment", t)} onChange={(value) => setMoment(value as MealMoment)} /></Field>
          <Field label={t("meal.quantity")}><input type="number" min={1} value={grams} onChange={(e) => setGrams(Number(e.target.value))} className="input" /></Field>
        </div>
        <button className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-mint to-lime-400 px-4 py-2.5 font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5">
          <Plus size={18} />
          {t("meal.save")}
        </button>
      </form>
      <div className="surface-card p-5">
        <h3 className="font-bold">{t("meal.calculatedValues")}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("meal.forFood", { grams, food: foodLabel(selectedFood.name, t) })}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <SmallStat label={t("common.calories")} value={`${round(calculated.calories)} ${t("common.kcal")}`} />
          <SmallStat label={t("common.protein")} value={`${round(calculated.protein)} ${t("common.grams")}`} />
          <SmallStat label={t("common.carbs")} value={`${round(calculated.carbs)} ${t("common.grams")}`} />
          <SmallStat label={t("common.fat")} value={`${round(calculated.fat)} ${t("common.grams")}`} />
        </div>
      </div>
    </section>
  );
}

function DailyJournal({
  meals,
  totals,
  targets,
}: {
  meals: MealEntry[];
  totals: ReturnType<typeof sumMeals>;
  targets: ReturnType<typeof calculateTargets>;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-6">
      <div className="surface-card p-5">
        <h2 className="text-xl font-bold">{t("journal.title")}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <SmallStat label={t("common.calories")} value={`${round(totals.calories)} / ${targets.targetCalories}`} />
          <SmallStat label={t("common.protein")} value={`${round(totals.protein)} / ${targets.proteinG} ${t("common.grams")}`} />
          <SmallStat label={t("common.carbs")} value={`${round(totals.carbs)} / ${targets.carbsG} ${t("common.grams")}`} />
          <SmallStat label={t("common.fat")} value={`${round(totals.fat)} / ${targets.fatG} ${t("common.grams")}`} />
        </div>
      </div>
      <EntryTable
        empty={t("journal.empty")}
        rows={meals.map((meal) => [
          t(`options.moment.${meal.moment}`),
          foodLabel(meal.foodName, t),
          `${meal.grams} ${t("common.grams")}`,
          `${round(meal.calories)} ${t("common.kcal")}`,
          `${round(meal.protein)} P / ${round(meal.carbs)} G / ${round(meal.fat)} L`,
        ])}
        headers={[t("journal.moment"), t("journal.food"), t("journal.quantity"), t("common.calories"), t("common.macros")]}
      />
    </section>
  );
}

function PhysicalTracking({ entries, onAdd }: { entries: PhysicalEntry[]; onAdd: (entry: PhysicalEntry) => void }) {
  const { t } = useTranslation();
  const [weightKg, setWeightKg] = useState(75);
  const [waistCm, setWaistCm] = useState("");
  const [chestCm, setChestCm] = useState("");
  const [beforePhoto, setBeforePhoto] = useState("");
  const [afterPhoto, setAfterPhoto] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onAdd({
      id: crypto.randomUUID(),
      date: todayIso(),
      weightKg,
      waistCm: waistCm ? Number(waistCm) : undefined,
      chestCm: chestCm ? Number(chestCm) : undefined,
      beforePhoto: beforePhoto || undefined,
      afterPhoto: afterPhoto || undefined,
    });
  }

  return (
    <section className="space-y-6">
      <form onSubmit={submit} className="surface-card p-5">
        <h2 className="text-xl font-bold">{t("physical.title")}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label={t("physical.weightKg")}><input type="number" value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} className="input" /></Field>
          <Field label={t("physical.waistCm")}><input value={waistCm} onChange={(e) => setWaistCm(e.target.value)} className="input" /></Field>
          <Field label={t("physical.chestCm")}><input value={chestCm} onChange={(e) => setChestCm(e.target.value)} className="input" /></Field>
          <Field label={t("physical.beforePhoto")}><input value={beforePhoto} onChange={(e) => setBeforePhoto(e.target.value)} className="input" /></Field>
          <Field label={t("physical.afterPhoto")}><input value={afterPhoto} onChange={(e) => setAfterPhoto(e.target.value)} className="input" /></Field>
        </div>
        <button className="mt-6 rounded-xl bg-gradient-to-r from-mint to-lime-400 px-4 py-2.5 font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5">{t("physical.save")}</button>
      </form>
      <EntryTable
        empty={t("physical.empty")}
        headers={[t("common.date"), t("common.weight"), t("common.waist"), t("common.chest")]}
        rows={entries.map((entry) => [
          entry.date,
          `${entry.weightKg} kg`,
          entry.waistCm ? `${entry.waistCm} cm` : "-",
          entry.chestCm ? `${entry.chestCm} cm` : "-",
        ])}
      />
    </section>
  );
}

function WeeklyReport({ meals, physicalEntries }: { meals: MealEntry[]; physicalEntries: PhysicalEntry[] }) {
  const { t } = useTranslation();
  const weekMeals = getLastDaysMeals(meals, 7);
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const startIso = start.toISOString().slice(0, 10);
  const weekPhysicalEntries = physicalEntries.filter((entry) => entry.date >= startIso);
  const averages = averageMeals(weekMeals);
  const weightChange = getWeightChange(weekPhysicalEntries);

  return (
    <ReportShell title={t("reports.weeklyTitle")} subtitle={t("reports.weeklySubtitle")}>
      <ReportStats averages={averages} />
      <SmallStat label={t("reports.weightChange")} value={`${weightChange.toFixed(1)} kg`} />
      <Advice text={weightChange < 0 ? t("reports.weightDown") : t("reports.regularity")} />
    </ReportShell>
  );
}

function MonthlyReport({
  meals,
  physicalEntries,
  targets,
}: {
  meals: MealEntry[];
  physicalEntries: PhysicalEntry[];
  targets: ReturnType<typeof calculateTargets>;
}) {
  const { t } = useTranslation();
  const monthMeals = getThisMonthMeals(meals);
  const month = todayIso().slice(0, 7);
  const monthPhysicalEntries = physicalEntries.filter((entry) => entry.date.startsWith(month));
  const totals = sumMeals(monthMeals);
  const averages = averageMeals(monthMeals);
  const weightChange = getWeightChange(monthPhysicalEntries);
  const waistChange = getWaistChange(monthPhysicalEntries);
  const respected = averages.calories >= targets.targetCalories * 0.9 && averages.calories <= targets.targetCalories * 1.1;

  return (
    <ReportShell title={t("reports.monthlyTitle")} subtitle={t("reports.monthlySubtitle")}>
      <div className="grid gap-3 md:grid-cols-3">
        <SmallStat label={t("reports.totalCalories")} value={`${round(totals.calories)} ${t("common.kcal")}`} />
        <SmallStat label={t("reports.weightChange")} value={`${weightChange.toFixed(1)} kg`} />
        <SmallStat label={t("reports.waistChange")} value={`${waistChange.toFixed(1)} cm`} />
      </div>
      <ReportStats averages={averages} />
      <Advice text={respected ? t("reports.respected") : t("reports.improve")} />
    </ReportShell>
  );
}

function YearPlanning({ meals, physicalEntries }: { meals: MealEntry[]; physicalEntries: PhysicalEntry[] }) {
  const { t, i18n } = useTranslation();
  const locale = getDateLocale(i18n.language);
  const rows = Array.from({ length: 12 }, (_, index) => {
    const month = `${new Date().getFullYear()}-${String(index + 1).padStart(2, "0")}`;
    const monthMeals = meals.filter((meal) => meal.date.startsWith(month));
    const avg = averageMeals(monthMeals);
    const monthWeights = physicalEntries.filter((entry) => entry.date.startsWith(month));
    const latestWeight = monthWeights[0]?.weightKg;

    return [
      new Date(`${month}-01`).toLocaleDateString(locale, { month: "long" }),
      latestWeight ? `${latestWeight} kg` : "-",
      monthMeals.length ? `${round(avg.calories)} ${t("common.kcal")}` : "-",
      monthMeals.length ? `${round(avg.protein)} ${t("common.grams")}` : "-",
      monthMeals.length ? t("planning.inProgress") : "-",
    ];
  });

  return <EntryTable headers={[t("planning.month"), t("common.weight"), t("planning.avgCalories"), t("planning.avgProtein"), t("common.goal")]} rows={rows} empty="" />;
}

function ReportShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="surface-card p-5">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function ReportStats({ averages }: { averages: ReturnType<typeof averageMeals> }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <SmallStat label={t("reports.avgCalories")} value={`${round(averages.calories)} ${t("common.kcal")}`} />
      <SmallStat label={t("reports.avgProtein")} value={`${round(averages.protein)} ${t("common.grams")}`} />
      <SmallStat label={t("reports.avgCarbs")} value={`${round(averages.carbs)} ${t("common.grams")}`} />
      <SmallStat label={t("reports.avgFat")} value={`${round(averages.fat)} ${t("common.grams")}`} />
    </div>
  );
}

function Advice({ text }: { text: string }) {
  return <div className="rounded-2xl border border-mint/30 bg-mint/10 p-4 font-semibold text-slate-800 dark:text-slate-200">{text}</div>;
}

function EntryTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-bold">{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-4 py-5 text-slate-500 dark:text-slate-400" colSpan={headers.length}>{empty}</td></tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.join("-")}-${index}`} className="border-t border-slate-100 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                  {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3">{cell}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Select({
  value,
  values,
  labels,
  onChange,
}: {
  value: string;
  values: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="input">
      {values.map((option) => (
        <option key={option} value={option}>
          {labels?.[option] ?? option}
        </option>
      ))}
    </select>
  );
}

function optionLabels(group: "sex" | "goal" | "level" | "activity" | "moment", t: (key: string) => string) {
  const optionGroups = {
    sex: sexes,
    goal: goals,
    level: levels,
    activity: activityLevels,
    moment: moments,
  };

  return Object.fromEntries(optionGroups[group].map((option) => [option, t(`options.${group}.${option}`)]));
}

function foodLabel(name: string, t: (key: string) => string) {
  return t(`foods.${name}`);
}

function scaleFood(food: Food, grams: number) {
  const factor = grams / 100;
  return {
    calories: food.calories * factor,
    protein: food.protein * factor,
    carbs: food.carbs * factor,
    fat: food.fat * factor,
  };
}

export default App;
