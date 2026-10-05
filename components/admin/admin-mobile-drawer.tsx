"use client";

import React, { useEffect } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { X } from "lucide-react";

interface AdminMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminMobileDrawer({ isOpen, onClose }: AdminMobileDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative flex flex-col w-72 max-w-[85vw] bg-bg-sidebar shadow-2xl z-10 animate-slideInLeft">
        {/* Close Button Header */}
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-text-light/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <AdminSidebar onItemClick={onClose} className="w-full border-r-0" />
      </div>
    </div>
  );
}
