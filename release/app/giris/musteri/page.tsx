import { LoginLayout } from "@/components/ui/login-layout";
import { CustomerLoginForm } from "@/components/ui/customer-login-form";

export const metadata = {
  title: "Müşteri Girişi — WCAGTR",
  description: "WCAGTR müşteri paneline giriş yapın veya yeni hesap oluşturun.",
};

type CustomerLoginPageProps = {
  searchParams?: {
    tab?: string;
  };
};

export default function CustomerLoginPage({ searchParams }: CustomerLoginPageProps) {
  const defaultTab = searchParams?.tab === "register" ? "register" : "login";

  return (
    <main id="main-content" tabIndex={-1}>
      <LoginLayout panelType="customer">
        <CustomerLoginForm defaultTab={defaultTab} />
      </LoginLayout>
    </main>
  );
}
