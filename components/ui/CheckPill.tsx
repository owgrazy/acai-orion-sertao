"use client";

type Props = {
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
};

export default function CheckPill({ checked, onChange, label }: Props) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <input
        className="sr-only"
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />

      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          border: checked ? "2px solid var(--primary)" : "2px solid var(--border-strong)",
          background: checked ? "var(--primary)" : "transparent",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          transition: "0.18s ease",
          boxShadow: checked ? "0 0 12px rgba(168,85,247,0.35)" : "none",
        }}
      >
        <span
          style={{
            color: "#fff",
            fontSize: 12,
            lineHeight: 1,
            fontWeight: 900,
            opacity: checked ? 1 : 0,
            transform: checked ? "scale(1)" : "scale(0.7)",
            transition: "0.18s ease",
          }}
        >
          ✓
        </span>
      </span>

      <span style={{ color: "var(--text)" }}>{label}</span>
    </label>
  );
}
