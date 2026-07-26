import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { WalletProvider } from "@/context/WalletContext";

export default function DashboardLayout({
  children,
}) {
  return (
    <ProtectedRoute>
      <WalletProvider>
        <DashboardShell>
          {children}
        </DashboardShell>
      </WalletProvider>
    </ProtectedRoute>
  );
}