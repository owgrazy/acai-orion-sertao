import type React from "react";

export const ui = {
  appBg: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #3b1363 0%, #1c0f2e 35%, #0f0a17 100%)",
  } as React.CSSProperties,

  page: {
    padding: 18,
    fontFamily: "system-ui",
    maxWidth: 920,
    margin: "0 auto",
    color: "#f5ecff",
  } as React.CSSProperties,

  pageNarrow: {
    padding: 18,
    fontFamily: "system-ui",
    maxWidth: 620,
    margin: "0 auto",
    color: "#f5ecff",
  } as React.CSSProperties,

  section: {
    marginTop: 14,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    background:
      "linear-gradient(135deg, rgba(111,54,168,0.28), rgba(34,19,52,0.82))",
    boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
    backdropFilter: "blur(6px)",
    color: "#f8f3ff",
  } as React.CSSProperties,

  sectionSoft: {
    marginTop: 14,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 24,
    background:
      "linear-gradient(135deg, rgba(150,84,255,0.22), rgba(43,18,70,0.88))",
    boxShadow: "0 16px 40px rgba(0,0,0,0.26)",
    color: "#f8f3ff",
  } as React.CSSProperties,

  card: {
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 14,
    background:
      "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    color: "#f8f3ff",
  } as React.CSSProperties,

  input: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid #d8c8ee",
    background: "#ffffff",
    color: "#1a1026",
    outline: "none",
  } as React.CSSProperties,

  inputReadonly: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid #d8c8ee",
    background: "#f3ecfb",
    color: "#3b2a4f",
    outline: "none",
  } as React.CSSProperties,

  buttonPrimary: {
    padding: 12,
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #a855f7, #7c3aed)",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(124,58,237,0.35)",
  } as React.CSSProperties,

  buttonSecondary: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#f8f3ff",
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,

  buttonGhost: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "#f8f3ff",
    cursor: "pointer",
  } as React.CSSProperties,

  title: {
    margin: 0,
    color: "#ffffff",
  } as React.CSSProperties,

  subtitle: {
    opacity: 0.85,
    fontSize: 13,
    color: "#e8dfff",
  } as React.CSSProperties,
};