"use client";

import React, { useState, useSyncExternalStore } from "react";
import { PortalRole, DemoAccount } from "@/lib/auth/types";
import { DEMO_ACCOUNTS } from "@/lib/auth/constants";
import { getSavedTerminalRole } from "@/lib/auth/storage";
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

export function AuthCard() {
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

  function handleSelectDemo(account: DemoAccount) {
    setActiveRole(account.role);
    setEmail(account.email);
    if (account.defaultPassword) {
      setPassword(account.defaultPassword);
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
      />

      {/* Demo Credentials Quick-Fill Box */}
      <DemoCredentialsBox onSelectDemo={handleSelectDemo} />
    </div>
  );
}
