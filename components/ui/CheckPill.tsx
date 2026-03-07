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
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ display: "none" }}
      />

      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          border: checked ? "2px solid #c084fc" : "2px solid rgba(255,255,255,0.28)",
          background: checked ? "linear-gradient(135deg, #a855f7, #7c3aed)" : "transparent",
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

      <span style={{ color: "#fff" }}>{label}</span>
    </label>
  );
}