import React from "react";
import { ArrowLeft } from "lucide-react";

const HeaderBar = ({ title, onBack }) => (
  <div className="border-b border-day-border/70 bg-day-background/95 backdrop-blur dark:border-night-border/70 dark:bg-night-background/95">
    <div className="mx-auto flex max-w-shell items-center gap-4 px-4 py-4 sm:px-6 xl:px-8">
      <button
        type="button"
        onClick={onBack}
        className="grid h-11 w-11 place-items-center rounded-2xl border border-day-border bg-day-surface text-day-muted transition hover:bg-day-panel hover:text-day-text dark:border-night-border dark:bg-night-surface dark:text-night-muted dark:hover:bg-night-panel dark:hover:text-night-text"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2.1} />
      </button>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-day-muted dark:text-night-muted">
          Property detail
        </p>
        <h1 className="truncate text-xl font-semibold text-day-text dark:text-night-text sm:text-2xl">
          {title}
        </h1>
      </div>
    </div>
  </div>
);

export default HeaderBar;
