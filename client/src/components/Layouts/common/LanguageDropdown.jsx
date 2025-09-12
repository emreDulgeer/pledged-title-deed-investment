// src/components/Layouts/Admin/Topbar/LanguageDropdown.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

const LanguageDropdown = ({ currentLanguage, changeLanguage }) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const Option = ({ code, children }) => (
    <button
      onClick={() => {
        changeLanguage(code);
        setOpen(false);
      }}
      className={`block px-4 py-2 text-sm w-full text-left ${
        currentLanguage === code
          ? "bg-day-primary text-white dark:bg-night-primary dark:text-night-background"
          : "text-day-text dark:text-night-text hover:bg-gray-100 dark:hover:bg-night-primary-dark"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-day-text dark:text-night-text hover:bg-gray-100 dark:hover:bg-night-primary-dark"
      >
        <span className="text-sm font-medium">
          {currentLanguage.toUpperCase()}
        </span>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-night-surface ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            <Option code="en">{t("languages.en")}</Option>
            <Option code="pt">{t("languages.pt")}</Option>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageDropdown;
