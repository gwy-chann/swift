import React from "react";

interface PesoIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

/**
 * Standardized Philippine Peso (₱) SVG icon styled to match Lucide Icon specifications
 */
export function PesoIcon({ className = "w-4 h-4", size, ...props }: PesoIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M7 21V4h7a5 5 0 0 1 0 10H7" />
      <line x1="4" y1="8" x2="16" y2="8" />
      <line x1="4" y1="12" x2="16" y2="12" />
    </svg>
  );
}
