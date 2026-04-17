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
import NotificationProvider from "./context/NotificationProvider";
import GlobalAlerts from "./components/common/GlobalAlerts";
import "./i18n/config";

import AdminLayout from "./views/layouts/AdminLayout";
import PublicLayout from "./views/layouts/PublicLayout";
import LoginPage from "./views/auth/LoginPage";
import AdminPendingKycDetail from "./views/admin/AdminPendingKycDetail";
import AdminPropertyDetail from "./views/admin/AdminPropertyDetail";
import AdminInvestments from "./views/admin/AdminInvestments";
import AdminInvestmentDetail from "./views/admin/AdminInvestmentDetail";
import AdminMembershipPlans from "./views/admin/AdminMembershipPlans";
import AdminUserDirectory from "./views/admin/AdminUserDirectory";
import PropertyDetail from "./views/property/PropertyDetail";
import AdminProperties from "./views/admin/AdminProperties";
import PrivateRoute from "./routes/PrivateRoute";
import RoleBasedRoute from "./routes/RoleBasedRoute";

// Investor imports
import InvestorLayout from "./views/layouts/InvestorLayout";
import InvestorDashboard from "./components/Dashboards/InvestorDashboard";
import InvestorInvestmentsList from "./views/investor/InvestorInvestmentsList";
import InvestorInvestmentDetail from "./views/investor/InvestorInvestmentDetail";
import InvestorRentalPayments from "./views/investor/InvestorRentalPayments";

// Owner imports
import OwnerLayout from "./views/layouts/OwnerLayout";
import OwnerDashboard from "./components/Dashboards/OwnerDashboard";
import OwnerProperties from "./views/owner/OwnerProperties";
import OwnerRentalPayments from "./views/owner/OwnerRentalPayments";
import OwnerPropertyCreate from "./views/owner/OwnerPropertyCreate";

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
    let cancelled = false;

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
            if (!cancelled) setBooting(false);
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
                if (!cancelled) setBooting(false);
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
            if (!cancelled) setBooting(false);
            return;
          }

          // 3) Kullanıcıyı hydrate et (verify user varsa öncelik bu)
          if (verifyRes?.data?.user) {
            dispatch(setUser(verifyRes.data.user));
          } else {
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
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

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
          <Route path="properties" element={<AdminProperties />} />
          <Route path="membership-plans" element={<AdminMembershipPlans />} />
          <Route path="investments" element={<AdminInvestments />} />
          <Route path="investments/:id" element={<AdminInvestmentDetail />} />
          <Route
            path="users"
            element={<AdminUserDirectory mode="users" />}
          />
          <Route
            path="investors"
            element={<AdminUserDirectory mode="investors" />}
          />
          <Route
            path="property-owners"
            element={<AdminUserDirectory mode="propertyOwners" />}
          />
        </Route>

        {/* Investor (nested) */}
        <Route
          path="/investor"
          element={
            <PrivateRoute>
              <RoleBasedRoute allowedRoles={["investor"]}>
                <InvestorLayout />
              </RoleBasedRoute>
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<InvestorDashboard />} />
          <Route path="investments" element={<InvestorInvestmentsList />} />
          <Route
            path="investments/:id"
            element={<InvestorInvestmentDetail />}
          />
          <Route path="rental-payments" element={<InvestorRentalPayments />} />
        </Route>

        {/* Owner (nested) */}
        <Route
          path="/owner"
          element={
            <PrivateRoute>
              <RoleBasedRoute allowedRoles={["property_owner"]}>
                <OwnerLayout />
              </RoleBasedRoute>
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OwnerDashboard />} />
          <Route path="properties" element={<OwnerProperties />} />
          <Route path="properties/new" element={<OwnerPropertyCreate />} />
          <Route path="rental-payments" element={<OwnerRentalPayments />} />
          {/* Placeholder routes - ileride doldurulacak */}
          {/* <Route path="investments/:id" element={<OwnerInvestmentDetail />} /> */}
          {/* <Route path="notifications" element={<OwnerNotifications />} /> */}
          {/* <Route path="settings" element={<OwnerSettings />} /> */}
        </Route>

        <Route
          path="/auth/admin/pending-kyc/:userId"
          element={<AdminPendingKycDetail />}
        />
        <Route
          path="/admin/properties/:propertyId"
          element={<AdminPropertyDetail />}
        />
        <Route path="/owner/properties/:id" element={<PropertyDetail />} />

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
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </LanguageProvider>
    </ThemeProvider>
  </Provider>
);

export default App;
