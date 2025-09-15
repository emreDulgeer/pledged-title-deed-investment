// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Provider, useDispatch, useSelector } from "react-redux";
import store from "./store";
import {
  fetchCurrentUser,
  selectIsAuthenticated,
  selectUser,
  logout as logoutAction,
} from "./store/slices/authSlice";

import "./controllers/bridge";
import { setUser } from "./store/slices/authSlice";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import GlobalAlerts from "./components/common/GlobalAlerts";
import "./i18n/config";

import AdminLayout from "./views/layouts/AdminLayout";
import PublicLayout from "./views/layouts/PublicLayout";
import LoginPage from "./views/auth/LoginPage";
import AdminPendingKycDetail from "./views/admin/AdminPendingKycDetail";
import AdminPropertyDetail from "./views/admin/AdminPropertyDetail";

import PrivateRoute from "./routes/PrivateRoute";
import RoleBasedRoute from "./routes/RoleBasedRoute";

import authController from "./controllers/authController";
import { defaultPathByRole } from "./utils/roleRedirect";
import AdminDashboard from "./components/Dashboards/AdminDashboard";
import { tokenManager } from "./api/client";

const VERIFY_DEBOUNCE_MS = 15000; // 15 sn
const LAST_VERIFY_AT_KEY = "lastVerifyAt";

const AppContent = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const access = tokenManager.getAccessToken?.();
        const refresh = tokenManager.getRefreshToken?.();

        // 1) Access yoksa ama refresh varsa → sessiz yenile
        if (!access && refresh) {
          try {
            await authController.refreshToken();
          } catch (err) {
            console.error("Refresh token yenileme başarısız:", err);
            await authController.logout?.();
            dispatch(logoutAction());
            setBooting(false);
            return;
          }
        }

        // 2) Access varsa → verify (debounce + soft fail)
        const hasAccessNow = !!tokenManager.getAccessToken?.();
        let verifyRes = null;

        if (hasAccessNow) {
          const last = Number(localStorage.getItem(LAST_VERIFY_AT_KEY) || 0);
          const now = Date.now();

          if (now - last > VERIFY_DEBOUNCE_MS) {
            try {
              verifyRes = await authController.verifyToken();
              localStorage.setItem(LAST_VERIFY_AT_KEY, String(now));
            } catch (e) {
              // 401 → gerçekten yetkisiz; logout
              if (e?.statusCode === 401) {
                await authController.logout?.();
                dispatch(logoutAction());
                setBooting(false);
                return;
              }
              // 429 / 5xx → soft fail: oturumu düşürme, mevcut state ile devam
              console.warn("verify soft-failed:", e);
            }
          }

          // verify döndüyse ve valid değilse → logout
          if (verifyRes && verifyRes?.data?.valid === false) {
            await authController.logout?.();
            dispatch(logoutAction());
            setBooting(false);
            return;
          }

          // 3) Kullanıcıyı hydrate et (verify user varsa öncelik bu)
          if (verifyRes?.data?.user) {
            dispatch(setUser(verifyRes.data.user));
          } else if (!user) {
            await dispatch(fetchCurrentUser());
          }
        }
      } catch (err) {
        console.error("Boot auth flow error:", err);
        try {
          await authController.logout?.();
        } catch (logoutErr) {
          console.warn("Logout çağrısı başarısız:", logoutErr);
        }
        dispatch(logoutAction());
      } finally {
        setBooting(false);
      }
    })();
  }, [dispatch, user]);

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      <GlobalAlerts />
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Navigate to="/login" replace />} />
          <Route
            path="login"
            element={
              isAuthenticated && user ? (
                <Navigate to={defaultPathByRole(user.role)} replace />
              ) : (
                <LoginPage />
              )
            }
          />
        </Route>

        {/* Admin (nested) */}
        <Route
          path="/admin"
          element={
            <PrivateRoute>
              <RoleBasedRoute allowedRoles={["admin"]}>
                <AdminLayout />
              </RoleBasedRoute>
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>
        <Route
          path="/auth/admin/pending-kyc/:userId"
          element={<AdminPendingKycDetail />}
        />
        <Route
          path="/properties/my/properties/:propertyId"
          element={<AdminPropertyDetail />}
        />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

const App = () => (
  <Provider store={store}>
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  </Provider>
);

export default App;
