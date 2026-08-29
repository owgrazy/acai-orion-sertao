"use client";

type Props = {
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  name?: string;
};

export default function RadioPill({ checked, onChange, label, name }: Props) {
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
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
      />

      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          border: checked ? "2px solid var(--primary)" : "2px solid var(--border-strong)",
          background: checked ? "var(--primary-soft)" : "transparent",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          transition: "0.18s ease",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: checked ? "var(--primary)" : "transparent",
            boxShadow: checked ? "0 0 10px rgba(192,132,252,0.45)" : "none",
            transition: "0.18s ease",
          }}
        />
      </span>

      <span style={{ color: "var(--text)" }}>{label}</span>
    </label>
  );
}
