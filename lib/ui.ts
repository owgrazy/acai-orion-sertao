import type React from "react";

export const ui = {
  appBg: {
    minHeight: "100vh",
    background: "var(--bg)",
    color: "var(--text)",
  } as React.CSSProperties,

  page: {
    padding: 18,
    fontFamily: "system-ui",
    maxWidth: 920,
    margin: "0 auto",
    color: "var(--text)",
  } as React.CSSProperties,

  pageNarrow: {
    padding: 18,
    fontFamily: "system-ui",
    maxWidth: 620,
    margin: "0 auto",
    color: "var(--text)",
  } as React.CSSProperties,

  section: {
    marginTop: 14,
    padding: 14,
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    background: "var(--surface)",
    boxShadow: "var(--shadow-sm)",
    color: "var(--text)",
  } as React.CSSProperties,

  sectionSoft: {
    marginTop: 14,
    padding: 18,
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    background: "var(--surface-elevated)",
    boxShadow: "var(--shadow-md)",
    color: "var(--text)",
  } as React.CSSProperties,

  card: {
    border: "1px solid var(--border)",
    borderRadius: 18,
    padding: 14,
    background: "var(--surface)",
    boxShadow: "var(--shadow-sm)",
    color: "var(--text)",
  } as React.CSSProperties,

  input: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid var(--border-strong)",
    background: "var(--surface)",
    color: "var(--text)",
    outline: "none",
  } as React.CSSProperties,

  inputReadonly: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--surface-soft)",
    color: "var(--text-secondary)",
    outline: "none",
  } as React.CSSProperties,

  buttonPrimary: {
    padding: 12,
    borderRadius: 14,
    border: "none",
    background: "var(--primary)",
    color: "var(--on-primary)",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 22px color-mix(in srgb, var(--primary) 25%, transparent)",
  } as React.CSSProperties,

  buttonSecondary: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid var(--border-strong)",
    background: "var(--surface)",
    color: "var(--text)",
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,

  buttonGhost: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer",
  } as React.CSSProperties,

  title: {
    margin: 0,
    color: "var(--text)",
  } as React.CSSProperties,

  subtitle: {
    opacity: 0.85,
    fontSize: 13,
    color: "var(--text-secondary)",
  } as React.CSSProperties,
};
