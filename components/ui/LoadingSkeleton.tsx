import React from "react";

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-md ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
      <LoadingSkeleton className="h-6 w-3/4 mb-4" />
      <LoadingSkeleton className="h-4 w-1/2 mb-2" />
      <LoadingSkeleton className="h-4 w-2/3 mb-2" />
      <LoadingSkeleton className="h-10 w-32 mt-4" />
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3">
          <LoadingSkeleton className="h-8 w-8 rounded-full" />
          <LoadingSkeleton className="h-5 w-32" />
          <LoadingSkeleton className="h-5 w-20 ml-auto" />
        </div>
      ))}
    </div>
  );
}
