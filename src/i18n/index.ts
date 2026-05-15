import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import nl from "./locales/nl.json";

export const supportedLanguages = ["fr", "en", "nl", "es"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

const savedLanguage = localStorage.getItem("bodytrack-language") as SupportedLanguage | null;
const initialLanguage = savedLanguage && supportedLanguages.includes(savedLanguage) ? savedLanguage : "fr";

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    nl: { translation: nl },
    es: { translation: es },
  },
  lng: initialLanguage,
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (language) => {
  localStorage.setItem("bodytrack-language", language);
});

export default i18n;
