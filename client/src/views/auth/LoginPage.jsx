// src/views/auth/LoginPage.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login, selectAuth, clearError } from "../../store/slices/authSlice";
import { showAlert } from "../../store/slices/uiSlice";
import { useTheme } from "../../utils/hooks/useTheme";
import { defaultPathByRole } from "../../utils/roleRedirect";

const LoginPage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const { loginLoading, loginError } = useSelector(selectAuth);

  const [formData, setFormData] = useState({
    email: "admin@admin.com", // Pre-filled for testing
    password: "Admin123!@#", // Pre-filled for testing
    rememberMe: true,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Get the redirect path from location state
  const from = location.state?.from?.pathname || "/admin/dashboard";

  useEffect(() => {
    // Clear any existing errors when component mounts
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    // Show error alert if login fails
    if (loginError) {
      dispatch(
        showAlert({
          type: "error",
          title: t("auth.login_failed", "Login Failed"),
          message: loginError,
        })
      );
    }
  }, [loginError, dispatch, t]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = t("errors.required_field");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t("errors.invalid_email");
    }

    if (!formData.password) {
      newErrors.password = t("errors.required_field");
    } else if (formData.password.length < 6) {
      newErrors.password = t("errors.password_too_short");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const result = await dispatch(
        login({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe,
        })
      ).unwrap();

      // Success
      dispatch(
        showAlert({
          type: "success",
          message: t("auth.login_successful"),
        })
      );

      // Redirect to the originally requested page or dashboard
      const target = defaultPathByRole(result?.user?.role) || from;
      setTimeout(() => {
        navigate(target, { replace: true });
      }, 300);
    } catch (error) {
      // Error is handled by the loginError effect above
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-day-background dark:bg-night-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-day-primary dark:text-night-primary">
              EstateLink
            </h1>
            <p className="mt-2 text-sm text-day-text dark:text-night-text opacity-75">
              {t("navigation.admin_panel")}
            </p>
          </div>

          <h2 className="text-center text-3xl font-extrabold text-day-text dark:text-night-text">
            {t("auth.sign_in_to_account")}
          </h2>
          <p className="mt-2 text-center text-sm text-day-text dark:text-night-text opacity-75">
            {t("auth.dont_have_account")}{" "}
            <Link
              to="/register"
              className="font-medium text-day-primary dark:text-night-primary hover:opacity-80"
            >
              {t("auth.sign_up")}
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-day-text dark:text-night-text mb-1"
              >
                {t("auth.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`appearance-none relative block w-full px-3 py-2 border ${
                  errors.email
                    ? "border-red-300 dark:border-red-700"
                    : "border-day-border dark:border-night-border"
                } placeholder-gray-500 dark:placeholder-gray-400 text-day-text dark:text-night-text bg-day-surface dark:bg-night-surface rounded-lg focus:outline-none focus:ring-2 focus:ring-day-primary dark:focus:ring-night-primary focus:z-10 sm:text-sm`}
                placeholder={t("auth.email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-day-text dark:text-night-text mb-1"
              >
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    errors.password
                      ? "border-red-300 dark:border-red-700"
                      : "border-day-border dark:border-night-border"
                  } placeholder-gray-500 dark:placeholder-gray-400 text-day-text dark:text-night-text bg-day-surface dark:bg-night-surface rounded-lg focus:outline-none focus:ring-2 focus:ring-day-primary dark:focus:ring-night-primary focus:z-10 sm:text-sm`}
                  placeholder={t("auth.password")}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {showPassword ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    )}
                  </svg>
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.password}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="h-4 w-4 text-day-primary dark:text-night-primary focus:ring-day-primary dark:focus:ring-night-primary border-gray-300 rounded"
              />
              <label
                htmlFor="rememberMe"
                className="ml-2 block text-sm text-day-text dark:text-night-text"
              >
                {t("auth.remember_me")}
              </label>
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-day-primary dark:text-night-primary hover:opacity-80"
              >
                {t("auth.forgot_password")}
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loginLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                theme === "dark"
                  ? "bg-night-primary hover:bg-night-primary-dark focus:ring-night-primary"
                  : "bg-day-primary hover:bg-day-primary-dark focus:ring-day-primary"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              {loginLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("common.loading")}
                </>
              ) : (
                t("auth.sign_in")
              )}
            </button>
          </div>

          {/* Demo credentials info */}
          <div
            className={`mt-6 p-4 rounded-lg ${
              theme === "dark"
                ? "bg-night-primary/10 border border-night-primary"
                : "bg-day-primary/10 border border-day-primary"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                theme === "dark" ? "text-night-primary" : "text-day-primary"
              }`}
            >
              Demo Credentials
            </p>
            <p className="text-sm text-day-text dark:text-night-text mt-1">
              Email: admin@admin.com
              <br />
              Password: Admin123!@#
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
