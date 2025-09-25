import React from "react";

const AdminNotes = ({ notes, t }) => (
  <div className="bg-day-surface dark:bg-night-surface rounded-lg shadow-lg p-6">
    <h3 className="text-lg font-semibold text-day-text dark:text-night-text mb-2">
      {t("admin.kyc.bio")}
    </h3>
    <div
      className="p-4 rounded-lg
                    bg-day-secondary-light/15 dark:bg-night-secondary/20"
    >
      <p className="text-day-text dark:text-night-text/90">{notes}</p>
    </div>
  </div>
);

export default AdminNotes;
