import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "@/hooks/useI18n";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { TimerProvider } from "@/hooks/useTimer";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import BudgetsPage from "./pages/BudgetsPage";
import TimeTrackingPage from "./pages/TimeTrackingPage";
import InvoicesPage from "./pages/InvoicesPage";
import ClientsPage from "./pages/ClientsPage";
import ProjectsPage from "./pages/ProjectsPage";
import HomePage from "./pages/HomePage";
import KanbanPage from "./pages/KanbanPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import InvitePage from "./pages/InvitePage";
import SettingsPage from "./pages/SettingsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <TimerProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route index element={<HomePage />} />
                  
                  <Route path="clients" element={<ClientsPage />} />
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="budgets" element={<BudgetsPage />} />
                  <Route path="time" element={<TimeTrackingPage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="kanban" element={<KanbanPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
                <Route path="/invite/:token" element={<InvitePage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
