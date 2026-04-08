import React from "react";

type BadgeVariant = "upcoming" | "in_progress" | "complete" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  upcoming: "bg-blue-100 text-blue-800",
  in_progress: "bg-green-100 text-green-800",
  complete: "bg-gray-100 text-gray-800",
  default: "bg-masters-gold/20 text-masters-green-dark",
};

const labels: Record<string, string> = {
  upcoming: "Upcoming",
  in_progress: "In Progress",
  complete: "Final",
};

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant = (
    ["upcoming", "in_progress", "complete"].includes(status)
      ? status
      : "default"
  ) as BadgeVariant;

  return <Badge variant={variant}>{labels[status] ?? status}</Badge>;
}
