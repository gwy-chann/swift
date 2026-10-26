"use client";

import React, { useState, useEffect } from "react";
import { ALL_DEMO_ACCOUNTS } from "@/lib/auth/constants";
import { DemoAccount } from "@/lib/auth/types";
import { KeyRound } from "lucide-react";
import { StaffPinModal } from "@/components/staff/clock/staff-pin-modal";
import type { StaffKioskProfile } from "@/lib/staff/types";
import { listStaffUsersAction } from "@/lib/admin/user-actions";

interface DemoCredentialsBoxProps {
  onSelectDemo: (account: DemoAccount) => void;
  disabled?: boolean;
}

/**
 * Demo system accounts quick-fill box with interactive PIN authorization
 * Displays credentials for Admin and shop floor staff (Cashier, Mechanic, Inventory Clerk)
 * and prompts for employee PIN code just like the terminal punch clock
 */
function mergeDemoAccountsWithUsers(
  prevAccounts: DemoAccount[],
  users: Awaited<ReturnType<typeof listStaffUsersAction>>
): DemoAccount[] {
  return prevAccounts.map((acc) => {
    const matched = users.find(
      (u) => u.id === acc.id || u.email.toLowerCase() === acc.email.toLowerCase()
    );
    if (matched) {
      return {
        ...acc,
        name: matched.fullName,
        role: matched.role === "admin" ? "admin" : "staff",
        staffRole: matched.role,
        label: matched.roleDisplay,
        buttonLabel: `Use ${matched.role === "inventory_clerk" ? "Clerk" : matched.roleDisplay}`,
      };
    }
    return acc;
  });
}

export function DemoCredentialsBox({
  onSelectDemo,
  disabled = false,
}: Readonly<DemoCredentialsBoxProps>) {
  const [accounts, setAccounts] = useState<DemoAccount[]>(ALL_DEMO_ACCOUNTS);
  const [selectedAccount, setSelectedAccount] = useState<DemoAccount | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    listStaffUsersAction()
      .then((users) => {
        if (isMounted && users && users.length > 0) {
          setAccounts((prev) => mergeDemoAccountsWithUsers(prev, users));
        }
      })
      .catch(() => {
        // Fallback to ALL_DEMO_ACCOUNTS
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleAccountClick(account: DemoAccount) {
    setSelectedAccount(account);
    setIsPinModalOpen(true);
  }

  function handlePinSuccess(profile: StaffKioskProfile) {
    if (!selectedAccount) return;
    setIsPinModalOpen(false);
    onSelectDemo({
      ...selectedAccount,
      id: profile.id,
      name: profile.name,
      role: selectedAccount.role,
      staffRole: profile.role || selectedAccount.staffRole,
      label: profile.roleDisplay || selectedAccount.label,
    });
    setSelectedAccount(null);
  }

  return (
    <div className="mt-6 p-4 rounded-md bg-bg-muted border border-border text-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 font-bold text-text-primary text-xs tracking-wide">
          <KeyRound className="w-3.5 h-3.5 text-primary" />
          <span>Demo System Accounts:</span>
        </div>
        <span className="text-[10px] text-text-muted font-normal lowercase">PIN verification required</span>
      </div>

      <div className="space-y-2">
        {accounts.map((account) => {
          const isAdmin = account.role === "admin";
          const initials = (account.name || account.label)
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={account.email}
              className="flex items-center justify-between gap-2 p-2 rounded bg-bg-card border border-border-subtle hover:border-border transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 ${
                    isAdmin
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-secondary/10 text-secondary border border-secondary/20"
                  }`}
                >
                  {initials}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-text-primary text-xs">
                      {account.label}:
                    </span>
                    {account.name && (
                      <span className="text-[11px] text-text-muted hidden sm:inline">
                        {account.name}
                      </span>
                    )}
                    {account.pin && (
                      <span className="font-mono text-[10px] text-text-muted bg-bg-muted px-1.5 py-0.2 rounded border border-border/60">
                        PIN: {account.pin}
                      </span>
                    )}
                  </div>
                  <code className="text-text-secondary font-mono text-[11px] block truncate">
                    {account.email}
                  </code>
                </div>
              </div>

              <button
                type="button"
                disabled={disabled}
                onClick={() => handleAccountClick(account)}
                className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors cursor-pointer shrink-0 ${
                  isAdmin
                    ? "bg-primary-light text-primary hover:bg-primary hover:text-white border-primary-border"
                    : "bg-bg-hover text-text-primary hover:bg-secondary hover:text-white border-border"
                }`}
              >
                {account.buttonLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* Interactive PIN verification modal matching the Punch Clock */}
      {selectedAccount && (
        <StaffPinModal
          isOpen={isPinModalOpen}
          onClose={() => {
            setIsPinModalOpen(false);
            setSelectedAccount(null);
          }}
          targetProfile={{
            id: selectedAccount.id || "00000000-0000-0000-0000-000000000002",
            name: selectedAccount.name || selectedAccount.label,
            role: selectedAccount.label,
            avatarInitials: (selectedAccount.name || selectedAccount.label)
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase(),
          }}
          onSuccess={handlePinSuccess}
          actionContext="login"
        />
      )}
    </div>
  );
}
