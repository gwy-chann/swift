import React from "react";
import Link from "next/link";
import { AdminNavItem } from "@/lib/admin/types";

interface NavMenuItemProps {
  item: AdminNavItem;
  isActive: boolean;
  onClick?: () => void;
}

export function NavMenuItem({ item, isActive, onClick }: NavMenuItemProps) {
  const Icon = item.icon;

  const badgeStyle =
    item.badge?.variant === "danger"
      ? "bg-danger text-white"
      : item.badge?.variant === "warning"
      ? "bg-accent text-white"
      : item.badge?.variant === "success"
      ? "bg-success text-white"
      : "bg-bg-muted text-text-primary";

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`group flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-semibold transition-all duration-150 select-none ${
        isActive
          ? "bg-primary text-white shadow-xs font-bold"
          : "text-text-light/80 hover:text-white hover:bg-bg-sidebar-hover"
      }`}
    >
      <div className="flex items-center gap-2.5 truncate">
        {Icon && (
          <Icon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isActive ? "text-white" : "text-text-light/60 group-hover:text-white"
            }`}
          />
        )}
        <span className="truncate">{item.label}</span>
      </div>

      {item.badge && (
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${badgeStyle}`}
        >
          {item.badge.text}
        </span>
      )}
    </Link>
  );
}
