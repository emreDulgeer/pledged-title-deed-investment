import React from "react";
import { ArrowLeft } from "lucide-react";

const HeaderBar = ({ title, onBack }) => (
  <div
    className="bg-day-surface dark:bg-night-surface shadow-sm
                  border-b border-day-border dark:border-night-border"
  >
    <div className="container mx-auto px-4 py-4 flex items-center gap-4">
      <button
        onClick={onBack}
        className="p-2 rounded-lg hover:bg-day-background dark:hover:bg-night-dashboard"
      >
        <ArrowLeft className="w-5 h-5 text-day-text/80 dark:text-night-text/80" />
      </button>
      <h1 className="text-xl font-semibold text-day-text dark:text-night-text">
        {title}
      </h1>
    </div>
  </div>
);

export default HeaderBar;
