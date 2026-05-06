import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

import InvestmentController from "../../controllers/investmentController";
import { selectUser } from "../../store/slices/authSlice";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

const RepresentativeDashboard = () => {
  const user = useSelector(selectUser);
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState({ data: [], summary: { total: 0 } });
  const [assignments, setAssignments] = useState({
    data: [],
    summary: { total: 0, active: 0, titleDeedPending: 0 },
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [poolResponse, assignmentResponse] = await Promise.all([
        InvestmentController.getRepresentativeRequestPool(),
        InvestmentController.getRepresentativeAssignments(),
      ]);

      setPool(poolResponse?.data || { data: [], summary: { total: 0 } });
      setAssignments(
        assignmentResponse?.data || {
          data: [],
          summary: { total: 0, active: 0, titleDeedPending: 0 },
        },
      );
    } catch (error) {
      console.error("Representative dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const assignedRegions = useMemo(() => {
    if (Array.isArray(user?.regions) && user.regions.length) {
      return user.regions;
    }

    return user?.region ? [user.region] : [];
  }, [user]);

  const stats = [
    {
      label: "Assigned Regions",
      value: assignedRegions.length,
      tone: "text-sky-500",
    },
    {
      label: "Pending Requests",
      value: pool?.summary?.total || 0,
      tone: "text-amber-500",
    },
    {
      label: "Active Cases",
      value: assignments?.summary?.active || 0,
      tone: "text-emerald-500",
    },
    {
      label: "Title Deed Pending",
      value: assignments?.summary?.titleDeedPending || 0,
      tone: "text-violet-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-day-text dark:text-night-text">
          Regional Workflow Dashboard
        </h1>
        <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
          Track new representative requests and the cases you already manage in
          your assigned regions.
        </p>
      </div>

      <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
        <p className="text-sm font-medium text-day-text dark:text-night-text">
          Regions
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {assignedRegions.map((region) => (
            <span
              key={region}
              className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-200"
            >
              {region}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5"
          >
            <p className="text-sm text-day-text/60 dark:text-night-text/60">
              {item.label}
            </p>
            <p className={`mt-2 text-3xl font-bold ${item.tone}`}>
              {loading ? "..." : item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
                New Request Pool
              </h2>
              <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                Investors and owners waiting for a representative.
              </p>
            </div>
            <Link
              to="/rep/request-pool"
              className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-300"
            >
              View all
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {(pool?.data || []).slice(0, 5).map((item) => (
              <Link
                key={item.id}
                to={`/rep/investments/${item.id}`}
                className="block rounded-xl border border-day-border dark:border-night-border p-4 transition-colors hover:bg-day-border/10 dark:hover:bg-night-border/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-day-text dark:text-night-text">
                      {item.property?.city}, {item.property?.country}
                    </p>
                    <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                      Requested by {item.representativeRequest?.requestedByRole || "user"} on{" "}
                      {formatDate(item.representativeRequest?.requestDate)}
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                    {item.representativeRequest?.region}
                  </span>
                </div>
              </Link>
            ))}

            {!loading && !(pool?.data || []).length && (
              <div className="rounded-xl border border-dashed border-day-border dark:border-night-border p-5 text-sm text-day-text/60 dark:text-night-text/60">
                No open requests in your regions right now.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
                My Active Cases
              </h2>
              <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                Claimed investments currently under your follow-up.
              </p>
            </div>
            <Link
              to="/rep/cases"
              className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-300"
            >
              View all
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {(assignments?.data || []).slice(0, 5).map((item) => (
              <Link
                key={item.id}
                to={`/rep/investments/${item.id}`}
                className="block rounded-xl border border-day-border dark:border-night-border p-4 transition-colors hover:bg-day-border/10 dark:hover:bg-night-border/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-day-text dark:text-night-text">
                      {item.property?.city}, {item.property?.country}
                    </p>
                    <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                      {item.investor?.fullName || "Investor"} and{" "}
                      {item.propertyOwner?.fullName || "Owner"}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                    {item.status}
                  </span>
                </div>
              </Link>
            ))}

            {!loading && !(assignments?.data || []).length && (
              <div className="rounded-xl border border-dashed border-day-border dark:border-night-border p-5 text-sm text-day-text/60 dark:text-night-text/60">
                You have not claimed any case yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default RepresentativeDashboard;
