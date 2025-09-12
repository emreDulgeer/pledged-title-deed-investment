// src/hooks/useLanguage.ts (veya .js)
import { useContext } from "react";
import { LanguageContext } from "../../context/language-context";

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (ctx === undefined)
    throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
};
