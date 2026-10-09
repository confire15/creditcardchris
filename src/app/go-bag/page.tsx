import type { Metadata, Viewport } from "next";
import GetReady from "@/components/gobag/gobag";
const title = "Prepare | Emergency Supplies & Household Plan";
const description =
  "A practical emergency checklist for home supplies, go-bags, and your household plan. Saved on your device, with offline access.";
export const viewport: Viewport = {
  themeColor: "#fafbf7",
  colorScheme: "light",
};
export const metadata: Metadata = {
  metadataBase: new URL("https://getready.creditcardchris.com"),
  authors: [{ name: "Prepare for Super El Nino" }],
  title,
  description,
  keywords: [
    "emergency kit",
    "go-bag checklist",
    "emergency preparedness",
    "household supplies",
    "El Niño preparedness",
  ],
  alternates: { canonical: "https://getready.creditcardchris.com" },
  openGraph: {
    title,
    description,
    siteName: "Prepare for Super El Nino",
    url: "https://getready.creditcardchris.com",
    images: [
      {
        url: "/go-bag/opengraph-image",
        alt: "Prepare for Super El Nino emergency supplies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/go-bag/opengraph-image"],
  },
  icons: { icon: "/gobag/icon.svg", apple: "/gobag/icon-192.png" },
  manifest: "/gobag/manifest.webmanifest",
  appleWebApp: { title: "Prepare for Super El Nino" },
};
export default function GetReadyPage() {
  return <GetReady />;
}
