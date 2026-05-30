import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search } from "lucide-react";

import InvestmentController from "../../controllers/investmentController";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "-";

const RepresentativeRequestPool = () => {
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [search, setSearch] = useState("");
  const [pool, setPool] = useState({ data: [], summary: { total: 0 } });

  const loadPool = async () => {
    try {
      setLoading(true);
      const response = await InvestmentController.getRepresentativeRequestPool();
      setPool(response?.data || { data: [], summary: { total: 0 } });
    } catch (error) {
      console.error("Representative request pool error:", error);
      setPool({ data: [], summary: { total: 0 } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPool();
  }, []);

  const filteredRequests = useMemo(() => {
    if (!search.trim()) {
      return pool.data || [];
    }

    const query = search.trim().toLowerCase();
    return (pool.data || []).filter((item) =>
      [
        item.property?.city,
        item.property?.country,
        item.representativeRequest?.region,
        item.investor?.fullName,
        item.propertyOwner?.fullName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [pool, search]);

  const handleClaim = async (investmentId) => {
    try {
      setClaimingId(investmentId);
      const response =
        await InvestmentController.claimRepresentativeRequest(investmentId);

      if (response?.success) {
        await loadPool();
        window.alert("Request claimed successfully.");
      }
    } catch (error) {
      console.error("Claim representative request error:", error);
      window.alert(error.message || "Failed to claim representative request.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-day-text dark:text-night-text">
            Representative Request Pool
          </h1>
          <p className="mt-2 text-sm text-day-text/60 dark:text-night-text/60">
            Review the requests coming from your regions and claim the ones you
            will manage.
          </p>
        </div>

        <label className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-day-text/45 dark:text-night-text/45" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by city, region or party"
            className="w-80 rounded-lg border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </label>
      </div>

      {loading ? (
        <div className="grid min-h-[200px] place-items-center rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface">
          <div className="flex items-center gap-2 text-day-text/70 dark:text-night-text/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading request pool...
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-6 text-sm text-day-text/60 dark:text-night-text/60">
          No open representative requests matched your search.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredRequests.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-day-text dark:text-night-text">
                    {item.property?.city}, {item.property?.country}
                  </h2>
                  <p className="mt-1 text-sm text-day-text/60 dark:text-night-text/60">
                    {item.property?.fullAddress || "Address not provided"}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                  {item.representativeRequest?.region}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                    Case Stage
                  </p>
                  <p className="mt-2 text-sm font-medium text-day-text dark:text-night-text">
                    {String(item.status || "-").replaceAll("_", " ")}
                  </p>
                </div>
                <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                    Investment Amount
                  </p>
                  <p className="mt-2 text-sm font-medium text-day-text dark:text-night-text">
                    {item.amountInvested?.toLocaleString?.() || "-"}{" "}
                    {item.currency || ""}
                  </p>
                </div>
                <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                    Investor
                  </p>
                  <p className="mt-2 text-sm font-medium text-day-text dark:text-night-text">
                    {item.investor?.fullName || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                    Owner
                  </p>
                  <p className="mt-2 text-sm font-medium text-day-text dark:text-night-text">
                    {item.propertyOwner?.fullName || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                    Property Type
                  </p>
                  <p className="mt-2 text-sm font-medium text-day-text dark:text-night-text">
                    {String(item.property?.propertyType || "-").replaceAll("_", " ")}
                  </p>
                </div>
                <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                    Requested By
                  </p>
                  <p className="mt-2 text-sm font-medium capitalize text-day-text dark:text-night-text">
                    {String(item.representativeRequest?.requestedByRole || "-").replaceAll(
                      "_",
                      " ",
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-day-border dark:border-night-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-day-text/50 dark:text-night-text/50">
                    Requested On
                  </p>
                  <p className="mt-2 text-sm font-medium text-day-text dark:text-night-text">
                    {formatDate(item.representativeRequest?.requestDate)}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  to={`/rep/investments/${item.id}`}
                  className="rounded-xl border border-day-border dark:border-night-border px-4 py-2 text-sm font-medium text-day-text dark:text-night-text hover:bg-day-border/10 dark:hover:bg-night-border/10"
                >
                  Review Opportunity
                </Link>
                <button
                  type="button"
                  onClick={() => handleClaim(item.id)}
                  disabled={claimingId === item.id}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {claimingId === item.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    "Claim and Manage"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RepresentativeRequestPool;
