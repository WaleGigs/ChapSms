import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardShell from "@/components/dashboard/DashboardShell";
import WelcomeNoticeModal from "@/components/dashboard/WelcomeNoticeModal";
import { WalletProvider } from "@/context/WalletContext";

export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <WalletProvider>
        <WelcomeNoticeModal />
        <DashboardShell>{children}</DashboardShell>
      </WalletProvider>
    </ProtectedRoute>
  );
}
