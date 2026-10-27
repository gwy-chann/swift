"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PortalRole } from "@/lib/auth/types";
import { ALL_DEMO_ACCOUNTS, PORTAL_CONFIG } from "@/lib/auth/constants";
import {
  authenticateUserAction,
  cancelStaffPinChallengeAction,
} from "@/lib/auth/actions";
import { saveTerminalRole } from "@/lib/auth/storage";
import { punchStore } from "@/lib/store/punch-store";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

interface LoginFormProps {
  selectedRole: PortalRole;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  rememberTerminal: boolean;
  setRememberTerminal: (remember: boolean) => void;
  initialNotice?: string | null;
  onRoleChange?: (role: PortalRole) => void;
}

function getInitialErrorMessage(notice?: string | null): string | null {
  if (notice === "inactive") {
    return "Account is inactive. Please contact your workshop administrator.";
  }
  return null;
}

export function LoginForm({
  selectedRole,
  email,
  setEmail,
  password,
  setPassword,
  rememberTerminal,
  setRememberTerminal,
  initialNotice,
}: Readonly<LoginFormProps>) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    getInitialErrorMessage(initialNotice)
  );

  const portalConfig = PORTAL_CONFIG[selectedRole];

  const [prevRole, setPrevRole] = useState(selectedRole);
  if (selectedRole !== prevRole) {
    setPrevRole(selectedRole);
    setErrorMessage(null);
  }

  // Clear any existing legacy PIN challenge token on mount
  useEffect(() => {
    cancelStaffPinChallengeAction().catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage("Please enter your username or email.");
      return;
    }

    setIsLoading(true);

    try {
      // Save terminal preference if checked
      if (rememberTerminal) {
        saveTerminalRole(selectedRole);
      } else {
        saveTerminalRole(null);
      }

      const result = await authenticateUserAction({
        email,
        password,
        selectedRole,
        rememberTerminal,
      });

      if (!result.success) {
        setErrorMessage(result.error);
        setIsLoading(false);
        return;
      }

      // Sync active staff in punchStore if demo account or session user
      const matchedDemo = ALL_DEMO_ACCOUNTS.find(
        (a) => a.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (matchedDemo?.id) {
        punchStore.switchStaff({
          id: matchedDemo.id,
          name: matchedDemo.name || matchedDemo.label,
          role: matchedDemo.staffRole || matchedDemo.role,
          startOffShift: true,
        });
      } else if ("session" in result && result.session) {
        punchStore.switchStaff({
          id: result.session.id,
          name: result.session.name,
          role: result.session.staffRole || result.session.role,
          startOffShift: true,
        });
      }

      // Route directly to destination page
      if (result.redirectTo) {
        router.push(result.redirectTo);
      }
    } catch (err) {
      console.error("Login submission error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div
          role="alert"
          className="p-3 rounded-md bg-danger-light border border-danger text-danger text-xs flex items-start gap-2 animate-fadeIn"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Username / Email Field */}
      <div>
        <label
          htmlFor="authUsername"
          className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5"
        >
          Username or Email
        </label>
        <input
          id="authUsername"
          type="text"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={portalConfig.demoAccount.email}
          disabled={isLoading}
          className="w-full px-3.5 py-2.5 rounded-md border border-border bg-bg-input text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      {/* Password Field */}
      <div>
        <label
          htmlFor="authPassword"
          className="block text-xs font-semibold text-text-primary uppercase tracking-wider mb-1.5"
        >
          Password
        </label>
        <input
          id="authPassword"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••••"
          disabled={isLoading}
          className="w-full px-3.5 py-2.5 rounded-md border border-border bg-bg-input text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      {/* Remember Terminal & Forgot Password */}
      <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberTerminal}
            onChange={(e) => setRememberTerminal(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
          />
          <span>Remember this terminal</span>
        </label>

        <button
          type="button"
          onClick={() =>
            alert(
              "Please contact your System Administrator to reset your master credentials."
            )
          }
          className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          Forgot password?
        </button>
      </div>

      {/* Submit Action Button */}
      <button
        type="submit"
        disabled={isLoading}
        className={`w-full mt-2 py-3 px-4 rounded-md font-bold text-sm text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
          selectedRole === "admin"
            ? "bg-primary hover:bg-primary-hover active:scale-[0.99]"
            : "bg-secondary hover:bg-secondary-hover active:scale-[0.99]"
        } ${isLoading ? "opacity-75 cursor-not-allowed" : ""}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Authenticating...</span>
          </>
        ) : (
          <>
            <span>{portalConfig.submitLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
