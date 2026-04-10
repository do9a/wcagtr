import { LoginLayout } from "@/components/ui/login-layout";
import { AdminLoginForm } from "@/components/ui/admin-login-form";

export const metadata = {
  title: "Admin Girişi — WCAGTR",
  description: "WCAGTR yönetim paneline giriş yapın.",
};

export default function AdminLoginPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <LoginLayout panelType="admin">
        <AdminLoginForm />
      </LoginLayout>
    </main>
  );
}
