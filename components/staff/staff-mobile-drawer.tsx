"use client";

import React, { useEffect } from "react";
import { StaffSidebar } from "./staff-sidebar";
import { X } from "lucide-react";

interface StaffMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StaffMobileDrawer({ isOpen, onClose }: StaffMobileDrawerProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="relative z-10 flex flex-col max-w-xs w-full shadow-2xl animate-in slide-in-from-left duration-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close staff navigation drawer"
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <StaffSidebar onItemClick={onClose} className="w-full h-full" />
      </div>
    </div>
  );
}
