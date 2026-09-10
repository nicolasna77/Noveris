import type { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export async function redirectAfterSignIn(router: ReturnType<typeof useRouter>) {
  const session = await authClient.getSession();
  const role = session.data?.user.role;
  router.refresh();
  router.push(role === "ADMIN" ? "/admin" : "/dashboard");
}
