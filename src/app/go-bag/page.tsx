import type { Metadata, Viewport } from "next";
import GetReady from "@/components/gobag/gobag";
const title = "Household Preparation Plan | GetReady";
const description =
  "Prepare your home, pack your bag, and make a household plan for El Niño-related weather risks. Simple steps, personalized supplies, and offline access.";
export const viewport: Viewport = {
  themeColor: "#fafbf7",
  colorScheme: "light",
};
export const metadata: Metadata = {
  metadataBase: new URL("https://getready.creditcardchris.com"),
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
    siteName: "GetReady",
    url: "https://getready.creditcardchris.com",
    images: [
      {
        url: "/gobag/kit-illustration.svg",
        alt: "GetReady emergency supplies",
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/gobag/kit-illustration.svg"],
  },
  icons: { icon: "/gobag/icon.svg", apple: "/gobag/icon-192.png" },
  manifest: "/gobag/manifest.webmanifest",
  appleWebApp: { title: "GetReady" },
};
export default function GetReadyPage() {
  return <GetReady />;
}
