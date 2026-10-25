"use client";

import React, { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { PortalRole, DemoAccount } from "@/lib/auth/types";
import { DEMO_ACCOUNTS } from "@/lib/auth/constants";
import { getSavedTerminalRole } from "@/lib/auth/storage";
import { authenticateUserAction } from "@/lib/auth/actions";
import { punchStore } from "@/lib/store/punch-store";
import { RoleTabSwitcher } from "./role-tab-switcher";
import { LoginForm } from "./login-form";
import { DemoCredentialsBox } from "./demo-credentials-box";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getClientSavedRole(): PortalRole {
  return getSavedTerminalRole() || "admin";
}

function getServerSavedRole(): PortalRole {
  return "admin";
}

interface AuthCardProps {
  initialNotice?: string | null;
}

export function AuthCard({ initialNotice }: Readonly<AuthCardProps> = {}) {
  const router = useRouter();
  const savedRole = useSyncExternalStore(
    subscribe,
    getClientSavedRole,
    getServerSavedRole
  );

  const [activeRole, setActiveRole] = useState<PortalRole | null>(null);
  const selectedRole = activeRole ?? savedRole;

  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS[selectedRole].email);
  const [password, setPassword] = useState<string>("••••••••••••");
  const [rememberTerminal, setRememberTerminal] = useState<boolean>(true);

  function handleRoleChange(newRole: PortalRole) {
    setActiveRole(newRole);
    const otherRole: PortalRole = newRole === "admin" ? "staff" : "admin";
    if (email === DEMO_ACCOUNTS[otherRole].email) {
      setEmail(DEMO_ACCOUNTS[newRole].email);
    }
  }

  async function handleSelectDemo(account: DemoAccount) {
    setActiveRole(account.role);
    setEmail(account.email);
    if (account.defaultPassword) {
      setPassword(account.defaultPassword);
    }

    if (account.id) {
      punchStore.switchStaff({
        id: account.id,
        name: account.name || account.label,
        role: account.staffRole || account.role,
      });
    }

    try {
      const result = await authenticateUserAction({
        email: account.email,
        password: account.defaultPassword || "staff123••••••••",
        selectedRole: account.role,
        rememberTerminal,
      });

      if (result.success) {
        router.push(account.targetUrl || result.redirectTo);
      }
    } catch (err) {
      console.error("Auto authentication error:", err);
    }
  }

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-lg bg-bg-card border border-border shadow-lg">
      {/* Role Selection Switcher */}
      <RoleTabSwitcher
        selectedRole={selectedRole}
        onRoleChange={handleRoleChange}
      />

      {/* Main Login Form */}
      <LoginForm
        selectedRole={selectedRole}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        rememberTerminal={rememberTerminal}
        setRememberTerminal={setRememberTerminal}
        initialNotice={initialNotice}
      />

      {/* Demo Credentials Quick-Fill Box */}
      <DemoCredentialsBox onSelectDemo={handleSelectDemo} />
    </div>
  );
}
