import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search } from "lucide-react";

import InvestmentController from "../../controllers/investmentController";

const RepresentativeCases = () => {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assignments, setAssignments] = useState({
    data: [],
    summary: { total: 0, active: 0, titleDeedPending: 0 },
  });

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const response = await InvestmentController.getRepresentativeAssignments();
      setAssignments(
        response?.data || {
          data: [],
          summary: { total: 0, active: 0, titleDeedPending: 0 },
        },
      );
    } catch (error) {
      console.error("Representative assignments error:", error);
      setAssignments({
        data: [],
        summary: { total: 0, active: 0, titleDeedPending: 0 },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const filteredCases = useMemo(() => {
    if (!search.trim()) {
      return assignments.data || [];
    }

    const query = search.trim().toLowerCase();
    return (assignments.data || []).filter((item) =>
      [
        item.property?.city,
        item.property?.country,
        item.status,
        item.investor?.fullName,
        item.propertyOwner?.fullName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [assignments, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-day-text dark:text-night-text">
            My Representative Cases
          </h1>
          <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
            These are the investments you already manage. Use them as workflow
            queues and decide what can move to the next step.
          </p>
        </div>

        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-day-text/45 dark:text-night-text/45" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search cases"
            className="w-72 rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
          <p className="text-sm text-day-text/60 dark:text-night-text/60">
            Total Cases
          </p>
          <p className="mt-2 text-3xl font-bold text-day-text dark:text-night-text">
            {loading ? "..." : assignments.summary.total}
          </p>
        </div>
        <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
          <p className="text-sm text-day-text/60 dark:text-night-text/60">
            Active
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-500">
            {loading ? "..." : assignments.summary.active}
          </p>
        </div>
        <div className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5">
          <p className="text-sm text-day-text/60 dark:text-night-text/60">
            Title Deed Pending
          </p>
          <p className="mt-2 text-3xl font-bold text-violet-500">
            {loading ? "..." : assignments.summary.titleDeedPending}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-[200px] place-items-center rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface">
          <div className="flex items-center gap-2 text-day-text/70 dark:text-night-text/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading assignments...
          </div>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6 text-sm text-day-text/60 dark:text-night-text/60">
          No claimed cases matched your search.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-day-border/10 dark:bg-night-border/10">
                <tr className="text-left text-xs uppercase tracking-wide text-day-text/55 dark:text-night-text/55">
                  <th className="px-5 py-4">Property</th>
                  <th className="px-5 py-4">Investor</th>
                  <th className="px-5 py-4">Owner</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Workflow Gate</th>
                  <th className="px-5 py-4">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-day-border dark:divide-night-border">
                {filteredCases.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 text-sm text-day-text dark:text-night-text">
                      <p className="font-medium">
                        {item.property?.city}, {item.property?.country}
                      </p>
                      <p className="mt-1 text-day-text/55 dark:text-night-text/55">
                        {item.property?.fullAddress || "-"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-day-text dark:text-night-text">
                      {item.investor?.fullName || "-"}
                    </td>
                    <td className="px-5 py-4 text-sm text-day-text dark:text-night-text">
                      {item.propertyOwner?.fullName || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-day-text/65 dark:text-night-text/65">
                      {item.nextStep || "-"}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/rep/investments/${item.id}`}
                        className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-300"
                      >
                        Manage workflow
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepresentativeCases;
