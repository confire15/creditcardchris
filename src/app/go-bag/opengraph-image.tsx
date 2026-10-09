import { ImageResponse } from "next/og";
export const alt = "Prepare for Super El Nino — Emergency supplies, household plans, flood and storm preparation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#fafbf8", color: "#263b32", padding: 76, display: "flex", flexDirection: "column", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: 22, color: "#315d49", marginBottom: 28 }}>SMALL STEPS. A MORE PREPARED HOUSEHOLD.</div>
      <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.08 }}>Prepare for Super El Nino</div>
      <div style={{ fontSize: 28, marginTop: 30, color: "#58665f" }}>Emergency supplies · Household plans · Flood & storm preparation</div>
      <div style={{ fontSize: 20, marginTop: 36 }}>Practical preparedness. Follow official local forecasts.</div>
      <div style={{ fontSize: 20, color: "#a94329", marginTop: 30 }}>prepare.gocreditcardchris.com</div>
    </div>, size,
  );
}
