import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Credit Card Chris — Maximize Your Credit Card Rewards";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f1117",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: "50%",
            width: 800,
            height: 800,
            borderRadius: "50%",
            background: "rgba(212, 98, 26, 0.07)",
            filter: "blur(80px)",
            transform: "translateX(-50%)",
          }}
        />

        {/* Logo row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(212, 98, 26, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(212, 98, 26, 0.3)",
            }}
          >
            <div style={{ fontSize: 24, color: "#d4621a" }}>✦</div>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#e5e7eb" }}>
            Credit Card Chris
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-2px",
            color: "#f9fafb",
            marginBottom: 24,
            maxWidth: 800,
          }}
        >
          Stop leaving points{" "}
          <span style={{ color: "#d4621a" }}>on the table</span>
        </div>

        {/* Subheading */}
        <div
          style={{
            fontSize: 24,
            color: "#9ca3af",
            lineHeight: 1.5,
            maxWidth: 700,
            marginBottom: 56,
          }}
        >
          Know exactly which card to use for every purchase. Track rewards, sync your bank, and earn more — free.
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 32 }}>
          {[
            { value: "104+", label: "Cards" },
            { value: "Free", label: "To start" },
            { value: "AI", label: "Powered" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: "16px 32px",
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 800, color: "#d4621a" }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* URL badge */}
        <div
          style={{
            position: "absolute",
            bottom: 56,
            right: 80,
            fontSize: 16,
            color: "#6b7280",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            padding: "8px 16px",
          }}
        >
          creditcardchris.com
        </div>
      </div>
    ),
    { ...size }
  );
}
