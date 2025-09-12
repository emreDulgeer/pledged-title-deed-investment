// src/views/layouts/PublicLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";

const PublicLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-day-background via-white to-day-surface dark:from-night-background dark:via-night-surface dark:to-black px-4">
      <div className="w-full max-w-md bg-white dark:bg-night-surface shadow-2xl rounded-2xl p-8 border border-day-border/20 dark:border-night-border/30">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-day-primary dark:text-night-primary tracking-tight">
            EstateLink
          </h1>
          <p className="text-sm mt-2 text-day-text dark:text-night-text opacity-70">
            Secure Real Estate Investment Platform
          </p>
        </div>
        {/* Auth / Public Routes */}
        <Outlet />
      </div>
    </div>
  );
};

export default PublicLayout;
