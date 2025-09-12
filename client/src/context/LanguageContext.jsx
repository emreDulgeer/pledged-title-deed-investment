// src/context/LanguageContext.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import i18n from "../i18n/config";
import { LanguageContext } from "./language-context";

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(
    () => localStorage.getItem("language") || "en"
  );

  useEffect(() => {
    i18n.changeLanguage(currentLanguage);
    localStorage.setItem("language", currentLanguage);
  }, [currentLanguage]);

  const changeLanguage = (lang) => {
    if (["en", "pt"].includes(lang)) {
      setCurrentLanguage(lang);
      i18n.changeLanguage(lang);
    }
  };

  const value = {
    currentLanguage,
    changeLanguage,
    toggleLanguage: () =>
      changeLanguage(currentLanguage === "en" ? "pt" : "en"),
    isEnglish: currentLanguage === "en",
    isPortuguese: currentLanguage === "pt",
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

LanguageProvider.propTypes = { children: PropTypes.node.isRequired };
