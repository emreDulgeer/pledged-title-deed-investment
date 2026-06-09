import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Globe } from "lucide-react";

const LanguageDropdown = ({ currentLanguage, changeLanguage }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const Option = ({ code, children }) => (
    <button
      type="button"
      onClick={() => {
        changeLanguage(code);
        setOpen(false);
      }}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors ${
        currentLanguage === code
          ? "bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary"
          : "text-day-text dark:text-night-text hover:bg-day-panel/80 dark:hover:bg-night-panel/80"
      }`}
    >
      {children}
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-70">
        {code}
      </span>
    </button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Change language"
        className="shell-chip-button min-w-[88px] justify-between"
      >
        <span className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="text-sm font-medium">
            {currentLanguage.toUpperCase()}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-44 overflow-hidden rounded-2xl border border-day-border/80 bg-day-surface p-2 shadow-panel dark:border-night-border/80 dark:bg-night-surface">
          <div className="space-y-1">
            <Option code="en">{t("languages.en")}</Option>
            <Option code="pt">{t("languages.pt")}</Option>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageDropdown;
