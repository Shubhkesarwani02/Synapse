"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Initialize from document on mount to avoid mismatch
    const current = (document.documentElement.dataset.theme as "light" | "dark") || "light";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      document.documentElement.dataset.theme = next;
      localStorage.setItem("rh-theme", next);
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium btn-secondary hover:bg-[rgb(var(--elev))] transition-colors"
      aria-label="Toggle theme"
    >
      <span className="hidden sm:inline">{theme === "dark" ? "White" : "Black"} Theme</span>
      <span aria-hidden>
        {theme === "dark" ? (
          // Sun icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        ) : (
          // Moon icon
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path></svg>
        )}
      </span>
    </button>
  );
}
