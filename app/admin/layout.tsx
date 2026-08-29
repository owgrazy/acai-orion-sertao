import { requireAdmin } from "@/lib/auth/require-admin";
import AdminShell from "@/components/AdminShell";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();

  return <AdminShell>{children}</AdminShell>;
}
