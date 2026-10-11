import { redirect } from "next/navigation";
import { getServerSession, evaluateRouteAccess } from "@/lib/auth/session-guards";

export default async function LoginPage() {
  const session = await getServerSession();
  const decision = evaluateRouteAccess("/login", session);
  if (decision.action === "REDIRECT" && decision.destination) {
    redirect(decision.destination);
  }

  redirect("/");
}
