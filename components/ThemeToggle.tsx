"use client";

function currentTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export default function ThemeToggle() {
  function toggle() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("orion-theme", next);
  }

  return (
    <button className="icon-button theme-toggle" onClick={toggle} aria-label="Alternar tema claro ou escuro" title="Alternar tema">
      <span className="theme-toggle__light" aria-hidden="true">☀</span>
      <span className="theme-toggle__dark" aria-hidden="true">☾</span>
    </button>
  );
}
