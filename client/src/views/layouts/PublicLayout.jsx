import React from "react";
import { Outlet } from "react-router-dom";

const PublicLayout = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-day-background text-day-text dark:bg-night-background dark:text-night-text">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,53,39,0.08),_transparent_42%)] dark:bg-[radial-gradient(circle_at_top,_rgba(149,211,186,0.1),_transparent_40%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(93,104,124,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(93,104,124,0.08)_1px,transparent_1px)] [background-size:88px_88px] dark:opacity-20 dark:[background-image:linear-gradient(to_right,rgba(155,170,192,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(155,170,192,0.12)_1px,transparent_1px)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 to-transparent dark:from-white/[0.03] dark:to-transparent" />

      <div className="relative z-10 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
};

export default PublicLayout;
