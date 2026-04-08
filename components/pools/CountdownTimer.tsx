"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: string; // ISO date string
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(targetDate: string): TimeLeft | null {
  const difference = new Date(targetDate).getTime() - new Date().getTime();
  if (difference <= 0) return null;

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeLeft(calculateTimeLeft(targetDate));

    const timer = setInterval(() => {
      const tl = calculateTimeLeft(targetDate);
      setTimeLeft(tl);
      if (!tl) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!mounted) {
    return (
      <div className="flex gap-3 justify-center">
        {["Days", "Hrs", "Min", "Sec"].map((label) => (
          <div key={label} className="text-center">
            <div className="bg-masters-green-dark text-white rounded-lg px-3 py-2 min-w-[60px]">
              <span className="text-2xl font-mono font-bold">--</span>
            </div>
            <span className="text-xs text-gray-500 mt-1 block">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (!timeLeft) {
    return (
      <div className="text-center">
        <span className="text-lg font-semibold text-masters-green">
          Tournament has started! 🏌️
        </span>
      </div>
    );
  }

  const segments = [
    { value: timeLeft.days, label: "Days" },
    { value: timeLeft.hours, label: "Hrs" },
    { value: timeLeft.minutes, label: "Min" },
    { value: timeLeft.seconds, label: "Sec" },
  ];

  return (
    <div className="flex gap-3 justify-center">
      {segments.map(({ value, label }) => (
        <div key={label} className="text-center">
          <div className="bg-masters-green-dark text-white rounded-lg px-3 py-2 min-w-[60px]">
            <span className="text-2xl font-mono font-bold">
              {String(value).padStart(2, "0")}
            </span>
          </div>
          <span className="text-xs text-gray-500 mt-1 block">{label}</span>
        </div>
      ))}
    </div>
  );
}
