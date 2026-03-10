import Dashboard from "@/sections/Dashboard";
import AuthGuard from "@/components/AuthGuard";

export default function SearchPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
