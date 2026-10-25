import React from "react";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wrench } from "lucide-react";
import { getServerSession, evaluateRouteAccess } from "@/lib/auth/session-guards";

export const metadata: Metadata = {
  title: "SWIFT - Authentication Hub",
  description: "Role-Based Authentication Hub & Portal Login Switcher for SWIFT Workshop Management System",
};

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string; error?: string }>;
} = {}) {
  const params = await searchParams;
  const session = await getServerSession();
  const decision = evaluateRouteAccess("/", session);
  if (decision.action === "REDIRECT" && decision.destination) {
    redirect(decision.destination);
  }

  return (
    <main className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-4 sm:p-6 select-none relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      {/* Brand Header */}
      <header className="text-center mb-8">
        <div className="inline-flex items-center justify-center gap-2.5 px-4 py-2 rounded-lg bg-primary text-white shadow-md mb-3">
          <Wrench className="w-6 h-6 text-white" />
          <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white">
            SWIFT
          </h1>
        </div>
        <p className="text-sm font-medium text-text-secondary max-w-sm mx-auto">
          Motorcycle Parts & Repair Shop Management System
        </p>
      </header>

      {/* Authentication Card */}
      <AuthCard initialNotice={params?.notice} />

      {/* Footer Info */}
      <footer className="mt-8 text-center text-xs text-text-muted">
        <p>© 2026 SWIFT Workshop Management. All rights reserved.</p>
      </footer>
    </main>
  );
}
