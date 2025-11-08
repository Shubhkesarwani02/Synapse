"use client";

import ThemeToggle from "@/components/ThemeToggle";

export default function Header() {
  return (
    <header className="border-b border-[rgb(var(--border))] sticky top-0 z-30 bg-[rgb(var(--bg))]/80 backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--bg))]/60">
      <div className="container-pro h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-7 rounded-md bg-[rgb(var(--fg))]" aria-hidden />
          <span className="text-sm font-semibold tracking-wide">Recallhub</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
