import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { WalletProvider } from "@/context/WalletContext";
import WelcomeNoticeModal from "@/components/dashboard/WelcomeNoticeModal";
export default function DashboardLayout({
  children,
}) {
  return (
    <ProtectedRoute>
       <WelcomeNoticeModal />
      <WalletProvider>
        <DashboardShell>
          {children}
        </DashboardShell>
      </WalletProvider>
    </ProtectedRoute>
  );
}