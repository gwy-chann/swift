"use client";

import React, { useState, useSyncExternalStore } from "react";
import { PortalRole } from "@/lib/auth/types";
import { getSavedTerminalRole } from "@/lib/auth/storage";
import { RoleTabSwitcher } from "./role-tab-switcher";
import { LoginForm } from "./login-form";

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
  const savedRole = useSyncExternalStore(
    subscribe,
    getClientSavedRole,
    getServerSavedRole
  );

  const [activeRole, setActiveRole] = useState<PortalRole | null>(null);
  const isPinChallengeNotice =
    initialNotice === "pin_challenge_pending" || initialNotice === "pin_required";
  const selectedRole = activeRole ?? (isPinChallengeNotice ? "staff" : savedRole);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberTerminal, setRememberTerminal] = useState<boolean>(true);

  function handleRoleChange(newRole: PortalRole) {
    setActiveRole(newRole);
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
    </div>
  );
}
