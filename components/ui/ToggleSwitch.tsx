"use client";

type Props = {
  checked: boolean;
  onChange: () => void;
  labelOn?: string;
  labelOff?: string;
};

export default function ToggleSwitch({
  checked,
  onChange,
  labelOn = "Ativo",
  labelOff = "Inativo",
}: Props) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "var(--surface-soft)",
        color: "var(--text)",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 42,
          height: 24,
          borderRadius: 999,
          background: checked ? "var(--primary)" : "var(--border-strong)",
          position: "relative",
          transition: "0.18s ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 21 : 3,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "#fff",
            transition: "0.18s ease",
          }}
        />
      </span>

      <span style={{ fontSize: 13, fontWeight: 700 }}>
        {checked ? labelOn : labelOff}
      </span>
    </button>
  );
}
