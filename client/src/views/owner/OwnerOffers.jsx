import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ClipboardCheck,
  FilePlus2,
} from "lucide-react";
import { OffersTab } from "./OwnerProperties";

const OwnerOffers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-day-dashboard px-4 py-6 text-day-text dark:bg-night-dashboard dark:text-night-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-shell space-y-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="relative overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top_left,_rgba(149,211,186,0.34),_transparent_32%),linear-gradient(135deg,#0b1c30_0%,#10273d_52%,#003527_100%)] px-6 py-7 text-white shadow-accent sm:px-8 sm:py-9">
            <div className="absolute right-8 top-8 hidden h-28 w-28 rounded-full border border-white/10 bg-white/5 xl:block" />
            <div className="absolute bottom-0 right-0 h-44 w-44 translate-x-14 translate-y-14 rounded-full bg-night-primary/20 blur-3xl" />

            <button
              type="button"
              onClick={() => navigate("/owner/dashboard")}
              className="relative inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.2} />
              {t("navigation.dashboard", "Dashboard")}
            </button>

            <div className="relative mt-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/55">
                Owner workspace
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                Review investor offers without losing the property context.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/72 sm:text-base">
                Compare offer terms, open the full investment record, and accept
                or reject proposals from a single queue built around your
                listings.
              </p>
            </div>

            <div className="relative mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/owner/properties")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
              >
                {t("navigation.properties", "Properties")}
                <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/owner/properties/new")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <FilePlus2 className="h-4 w-4" strokeWidth={2.2} />
                {t("owner.add_property", "Add property")}
              </button>
            </div>
          </div>

          <aside className="shell-surface flex flex-col justify-between px-6 py-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                    Decision desk
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-day-text dark:text-night-text">
                    Keep deals moving
                  </h2>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-day-panel text-day-primary dark:bg-night-panel dark:text-night-primary">
                  <ClipboardCheck className="h-5 w-5" strokeWidth={2.2} />
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-day-muted dark:text-night-muted">
                Start from the property, inspect each investor proposal, then
                move accepted offers into the investment lifecycle.
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-day-border/70 bg-day-panel/70 p-4 dark:border-night-border/70 dark:bg-night-panel/70">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-day-primary dark:text-night-primary" />
                  <div>
                    <p className="text-sm font-semibold text-day-text dark:text-night-text">
                      Property-first review
                    </p>
                    <p className="text-xs text-day-muted dark:text-night-muted">
                      Offers stay grouped by listing for faster comparison.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <OffersTab />
      </div>
    </div>
  );
};

export default OwnerOffers;
