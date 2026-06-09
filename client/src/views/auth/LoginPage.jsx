import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { clearError, login, selectAuth } from "../../store/slices/authSlice";
import { showAlert } from "../../store/slices/uiSlice";
import { defaultPathByRole } from "../../utils/roleRedirect";

const demoCredentialGroups = [
  {
    title: "Admin",
    summary: "Platform controls and approval queues",
    accounts: [
      {
        label: "Platform Super Admin",
        email: "admin@admin.com",
        password: "Admin123!@#",
      },
    ],
  },
  {
    title: "Investors",
    summary: "Portfolio tracking and rental performance",
    accounts: [
      { label: "Emre Yilmaz", email: "emre@investor.com", password: "Test123!@#" },
      { label: "Lara Costa", email: "lara@investor.com", password: "Lara123!@#" },
      { label: "Selin Arslan", email: "selin@investor.com", password: "Selin123!@#" },
    ],
  },
  {
    title: "Property Owners",
    summary: "Asset management and document workflows",
    accounts: [
      { label: "Ayse Demir", email: "ayse@owner.com", password: "Owner123!@#" },
      { label: "Mehmet Kaya", email: "mehmet@owner.com", password: "Mehmet123!@#" },
    ],
  },
  {
    title: "Local Representatives",
    summary: "Country operations and request handling",
    accounts: [
      { label: "Portugal - Joao Silva", email: "joao@rep.com", password: "Rep123!@#" },
      { label: "Portugal / Spain - Ines Duarte", email: "ines@rep.com", password: "Rep123!@#" },
      { label: "Spain - Carlos Mendez", email: "carlos@rep.com", password: "Rep123!@#" },
      { label: "Latvia - Maris Ozols", email: "maris@rep.com", password: "Rep123!@#" },
      { label: "Estonia - Kristjan Saar", email: "kristjan@rep.com", password: "Rep123!@#" },
      { label: "Malta - John Pereira", email: "john@rep.com", password: "Rep123!@#" },
      { label: "Malta / Montenegro - Luca Novak", email: "luca@rep.com", password: "Rep123!@#" },
      { label: "Montenegro - Mila Petrovic", email: "mila@rep.com", password: "Rep123!@#" },
      { label: "Georgia - Nino Beridze", email: "nino@rep.com", password: "Rep123!@#" },
      { label: "Georgia - Giorgi Lomidze", email: "giorgi@rep.com", password: "Rep123!@#" },
    ],
  },
];

const trustHighlights = [
  {
    title: "Role-aware workspace",
    description: "Investor, owner, representative, and admin flows stay separated but consistent.",
  },
  {
    title: "Capital and property oversight",
    description: "Track listings, approvals, documents, and rental performance from one surface.",
  },
  {
    title: "Operational clarity",
    description: "Move between review queues, financial details, and account actions without context loss.",
  },
];

const LoginPage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loginLoading, loginError } = useSelector(selectAuth);

  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [formData, setFormData] = useState({
    email: "admin@admin.com",
    password: "Admin123!@#",
    rememberMe: true,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const activeGroup = demoCredentialGroups[activeGroupIndex];
  const from = location.state?.from?.pathname || "/admin/dashboard";

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (loginError) {
      dispatch(
        showAlert({
          type: "error",
          title: t("auth.login_failed", "Login Failed"),
          message: loginError,
        }),
      );
    }
  }, [dispatch, loginError, t]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = t("errors.required_field", "This field is required.");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t("errors.invalid_email", "Enter a valid email address.");
    }

    if (!formData.password) {
      newErrors.password = t("errors.required_field", "This field is required.");
    } else if (formData.password.length < 6) {
      newErrors.password = t("errors.password_too_short", "Password is too short.");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleDemoSelect = (groupIndex, account) => {
    setActiveGroupIndex(groupIndex);
    dispatch(clearError());
    setErrors({});
    setFormData((prev) => ({
      ...prev,
      email: account.email,
      password: account.password,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await dispatch(
        login({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe,
        }),
      ).unwrap();

      dispatch(
        showAlert({
          type: "success",
          message: t("auth.login_successful", "Login successful."),
        }),
      );

      const target = defaultPathByRole(result?.user?.role) || from;

      setTimeout(() => {
        navigate(target, { replace: true });
      }, 300);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="shell-surface relative overflow-hidden px-6 py-8 sm:px-8 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,53,39,0.12),_transparent_38%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(149,211,186,0.12),_transparent_34%)]" />
          <div className="absolute -right-16 top-10 h-40 w-40 rounded-full bg-day-primary/10 blur-3xl dark:bg-night-primary/10" />
          <div className="relative flex h-full flex-col">
            <div className="inline-flex w-fit items-center gap-4 rounded-3xl border border-day-border/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur dark:border-night-border/70 dark:bg-night-surface/[0.82]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-day-primary-light text-day-primary shadow-accent dark:bg-night-primary/20 dark:text-night-primary">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M8 21h8m-7-4h6m-9 4V7.4c0-.56 0-.84.109-1.052a1 1 0 01.438-.438C6.76 5.8 7.04 5.8 7.6 5.8h8.8c.56 0 .84 0 1.052.11a1 1 0 01.438.437c.11.213.11.493.11 1.053V21M9 5.8V4a1 1 0 011-1h4a1 1 0 011 1v1.8M9 10h6M9 13h6"
                  />
                </svg>
              </div>

              <div>
                <h2 className="font-display text-3xl font-semibold text-day-primary dark:text-night-primary">
                  EstateLink
                </h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.32em] text-day-muted dark:text-night-muted">
                  Institutional Investment Workspace
                </p>
              </div>
            </div>

            <div className="mt-10 max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-day-muted dark:text-night-muted">
                Unified real estate operations
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight text-day-text dark:text-night-text sm:text-5xl">
                Bring investors, property owners, and review teams into one calm control room.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-day-muted dark:text-night-muted">
                Access portfolio monitoring, property intake, document review, and rental payment
                workflows through a single role-aware workspace.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {trustHighlights.map((highlight) => (
                <article
                  key={highlight.title}
                  className="shell-subtle-surface px-5 py-5"
                >
                  <p className="text-sm font-semibold text-day-text dark:text-night-text">
                    {highlight.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
                    {highlight.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-auto pt-8">
              <div className="shell-subtle-surface flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-day-text dark:text-night-text">
                    Access is provisioned by EstateLink operations
                  </p>
                  <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                    This workspace does not use self-service signup. Use your assigned
                    credentials or the seeded demo accounts on the right.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-day-border/70 bg-day-surface/80 px-3 py-2 text-xs font-medium text-day-muted dark:border-night-border/70 dark:bg-night-surface/80 dark:text-night-muted">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Protected workspace
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="shell-surface relative overflow-hidden px-6 py-8 sm:px-8 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(92,100,122,0.08),_transparent_45%)] dark:bg-[radial-gradient(circle_at_top,_rgba(190,198,224,0.08),_transparent_42%)]" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-day-muted dark:text-night-muted">
                  Sign in
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-day-text dark:text-night-text">
                  {t("auth.sign_in_to_account", "Sign in to your account")}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-day-muted dark:text-night-muted">
                  Continue with your assigned account to enter the correct workspace and
                  permission set.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-day-border/70 bg-day-panel/70 px-3 py-2 text-xs font-medium text-day-muted dark:border-night-border/70 dark:bg-night-panel/70 dark:text-night-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Ready
              </div>
            </div>

            {loginError ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {loginError}
              </div>
            ) : null}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-day-text dark:text-night-text"
                >
                  {t("auth.email", "Email")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`shell-input ${
                    errors.email
                      ? "border-red-300 focus:border-red-400 focus:ring-red-400/10 dark:border-red-500/50 dark:focus:border-red-400"
                      : ""
                  }`}
                  placeholder={t("auth.email", "Email")}
                  required
                />
                {errors.email ? (
                  <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-300">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-day-text dark:text-night-text"
                  >
                    {t("auth.password", "Password")}
                  </label>
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                    Secure access
                  </p>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`shell-input pr-12 ${
                      errors.password
                        ? "border-red-300 focus:border-red-400 focus:ring-red-400/10 dark:border-red-500/50 dark:focus:border-red-400"
                        : ""
                    }`}
                    placeholder={t("auth.password", "Password")}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 inline-flex items-center justify-center px-4 text-day-muted transition hover:text-day-text focus:outline-none dark:text-night-muted dark:hover:text-night-text"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {showPassword ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M3 3l18 18M10.58 10.58A3 3 0 0013.42 13.42M9.88 5.09A9.77 9.77 0 0112 4.88c4.72 0 8.71 2.95 10 7.12a10.67 10.67 0 01-3.04 4.58M6.1 6.1A10.67 10.67 0 002 12c1.29 4.17 5.28 7.12 10 7.12 1.76 0 3.42-.41 4.88-1.14"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M2 12s3.64-7.12 10-7.12S22 12 22 12s-3.64 7.12-10 7.12S2 12 2 12zm10 3.12A3.12 3.12 0 1012 8.88a3.12 3.12 0 000 6.24z"
                        />
                      )}
                    </svg>
                  </button>
                </div>
                {errors.password ? (
                  <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-300">
                    {errors.password}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-3 text-sm text-day-muted dark:text-night-muted">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-day-border text-day-primary focus:ring-day-primary/20 dark:border-night-border dark:bg-night-surface dark:text-night-primary dark:focus:ring-night-primary/20"
                  />
                  <span>{t("auth.remember_me", "Remember me")}</span>
                </label>

                <p className="text-sm text-day-muted dark:text-night-muted">
                  Need access? Contact platform operations.
                </p>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-day-primary px-4 py-3.5 text-sm font-semibold text-white shadow-accent transition hover:bg-day-primary-dark focus:outline-none focus:ring-4 focus:ring-day-primary/15 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary-dark dark:focus:ring-night-primary/20"
              >
                {loginLoading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4zm2 5.29A7.95 7.95 0 014 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z"
                      />
                    </svg>
                    {t("common.loading", "Loading")}
                  </>
                ) : (
                  t("auth.sign_in", "Sign in")
                )}
              </button>
            </form>

            <div className="shell-subtle-surface mt-8 px-5 py-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-day-text dark:text-night-text">
                    Demo workspace access
                  </p>
                  <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                    Select a role and click an account to autofill both email and password.
                  </p>
                </div>
                <div className="text-xs font-medium uppercase tracking-[0.22em] text-day-muted dark:text-night-muted">
                  {activeGroup.accounts.length} account{activeGroup.accounts.length > 1 ? "s" : ""}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {demoCredentialGroups.map((group, groupIndex) => {
                  const isActive = groupIndex === activeGroupIndex;

                  return (
                    <button
                      key={group.title}
                      type="button"
                      onClick={() => setActiveGroupIndex(groupIndex)}
                      className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "border-day-primary bg-day-primary text-white dark:border-night-primary dark:bg-night-primary dark:text-night-background"
                          : "border-day-border bg-day-surface/80 text-day-muted hover:border-day-primary/30 hover:text-day-text dark:border-night-border dark:bg-night-surface/80 dark:text-night-muted dark:hover:border-night-primary/30 dark:hover:text-night-text"
                      }`}
                    >
                      {group.title}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-2xl border border-day-border/70 bg-day-surface/80 p-4 dark:border-night-border/70 dark:bg-night-surface/80">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-day-text dark:text-night-text">
                      {activeGroup.title}
                    </p>
                    <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                      {activeGroup.summary}
                    </p>
                  </div>
                  <div className="mt-2 rounded-full bg-day-panel px-3 py-1 text-xs font-medium text-day-muted dark:bg-night-panel dark:text-night-muted sm:mt-0">
                    Click to autofill
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {activeGroup.accounts.map((account) => {
                    const isSelected =
                      formData.email === account.email && formData.password === account.password;

                    return (
                      <button
                        key={account.email}
                        type="button"
                        onClick={() => handleDemoSelect(activeGroupIndex, account)}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          isSelected
                            ? "border-day-primary bg-day-primary/6 shadow-sm dark:border-night-primary dark:bg-night-primary/10"
                            : "border-day-border/70 bg-transparent hover:border-day-primary/30 hover:bg-day-panel/50 dark:border-night-border/70 dark:hover:border-night-primary/30 dark:hover:bg-night-panel/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-day-text dark:text-night-text">
                              {account.label}
                            </p>
                            <p className="mt-1 text-sm text-day-muted dark:text-night-muted">
                              {account.email}
                            </p>
                          </div>
                          {isSelected ? (
                            <span className="rounded-full bg-day-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white dark:bg-night-primary dark:text-night-background">
                              Selected
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
