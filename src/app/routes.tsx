import { lazy, ReactElement, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { LoadingScreen } from "./components/LoadingScreen";
import { useAuth } from "./lib/auth";

const LoginPage = lazy(async () => ({
  default: (await import("./pages/LoginPage")).LoginPage
}));
const AuthCallbackPage = lazy(async () => ({
  default: (await import("./pages/AuthCallbackPage")).AuthCallbackPage
}));
const OverviewPage = lazy(async () => ({
  default: (await import("./pages/OverviewPage")).OverviewPage
}));
const GuildDetailPage = lazy(async () => ({
  default: (await import("./pages/GuildDetailPage")).GuildDetailPage
}));
const GuildStreamersPage = lazy(async () => ({
  default: (await import("./pages/GuildStreamersPage")).GuildStreamersPage
}));
const GuildNotificationsPage = lazy(async () => ({
  default: (await import("./pages/GuildNotificationsPage")).GuildNotificationsPage
}));
const SetupPage = lazy(async () => ({
  default: (await import("./pages/SetupPage")).SetupPage
}));
const AccountPage = lazy(async () => ({
  default: (await import("./pages/AccountPage")).AccountPage
}));
const GlobalAdminPage = lazy(async () => ({
  default: (await import("./pages/GlobalAdminPage")).GlobalAdminPage
}));
const AdminWhitelistPage = lazy(async () => ({
  default: (await import("./pages/AdminWhitelistPage")).AdminWhitelistPage
}));
const AdminBotGuildsPage = lazy(async () => ({
  default: (await import("./pages/AdminBotGuildsPage")).AdminBotGuildsPage
}));
const AdminPresencePage = lazy(async () => ({
  default: (await import("./pages/AdminPresencePage")).AdminPresencePage
}));
const AdminAccessPage = lazy(async () => ({
  default: (await import("./pages/AdminAccessPage")).AdminAccessPage
}));

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Checking access..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function GlobalAdminRoute({ children }: { children: ReactElement }) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Checking admin access..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.isGlobalAdmin) {
    return <Navigate to="/dashboard/overview" replace />;
  }

  return children;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard/overview" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="guilds" element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="guilds/:guildId" element={<GuildDetailPage />} />
          <Route path="guilds/:guildId/streamers" element={<GuildStreamersPage />} />
          <Route path="guilds/:guildId/notifications" element={<GuildNotificationsPage />} />
          <Route path="setup" element={<SetupPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route
            path="admin"
            element={
              <GlobalAdminRoute>
                <GlobalAdminPage />
              </GlobalAdminRoute>
            }
          />
          <Route
            path="admin/whitelist"
            element={
              <GlobalAdminRoute>
                <AdminWhitelistPage />
              </GlobalAdminRoute>
            }
          />
          <Route
            path="admin/guilds"
            element={
              <GlobalAdminRoute>
                <AdminBotGuildsPage />
              </GlobalAdminRoute>
            }
          />
          <Route
            path="admin/presence"
            element={
              <GlobalAdminRoute>
                <AdminPresencePage />
              </GlobalAdminRoute>
            }
          />
          <Route
            path="admin/access"
            element={
              <GlobalAdminRoute>
                <AdminAccessPage />
              </GlobalAdminRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
      </Routes>
    </Suspense>
  );
}
