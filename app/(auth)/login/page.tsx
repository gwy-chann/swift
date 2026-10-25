import { redirect } from "next/navigation";
import { getServerSession, evaluateRouteAccess } from "@/lib/auth/session-guards";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string; error?: string }>;
} = {}) {
  const params = await searchParams;
  const session = await getServerSession();
  const decision = evaluateRouteAccess("/login", session);
  if (decision.action === "REDIRECT" && decision.destination) {
    redirect(decision.destination);
  }

  if (params?.notice) {
    redirect(`/?notice=${encodeURIComponent(params.notice)}`);
  }

  redirect("/");
}
