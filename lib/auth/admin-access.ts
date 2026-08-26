export type AdminAccess =
  | { status: "authorized"; userId: string }
  | { status: "unauthenticated" }
  | { status: "forbidden" };

type AdminAccessDependencies = {
  getUser: () => Promise<{ userId: string | null; error: unknown }>;
  getRole: (userId: string) => Promise<{ role: string | null; error: unknown }>;
};

export async function checkAdminAccess({
  getUser,
  getRole,
}: AdminAccessDependencies): Promise<AdminAccess> {
  const authenticatedUser = await getUser();

  if (authenticatedUser.error || !authenticatedUser.userId) {
    return { status: "unauthenticated" };
  }

  const profile = await getRole(authenticatedUser.userId);

  if (profile.error || profile.role !== "admin") {
    return { status: "forbidden" };
  }

  return { status: "authorized", userId: authenticatedUser.userId };
}
