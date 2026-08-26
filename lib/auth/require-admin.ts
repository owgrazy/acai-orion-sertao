import "server-only";

import { redirect } from "next/navigation";
import { checkAdminAccess } from "./admin-access";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();

  const access = await checkAdminAccess({
    async getUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      return { userId: user?.id ?? null, error };
    },
    async getRole(userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      return { role: data?.role ?? null, error };
    },
  });

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  if (access.status === "forbidden") {
    redirect("/menu");
  }

  return { ...access, supabase };
}
