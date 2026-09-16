import type { Metadata, Viewport } from "next";
import GoBag from "@/components/gobag/gobag";
const title = "Emergency Go-Bag Builder | GoBag";
const description =
  "Build a personalized emergency preparedness checklist, calculate supplies for your household, and find missing emergency essentials.";
export const viewport: Viewport = {
  themeColor: "#fafbf7",
  colorScheme: "light",
};
export const metadata: Metadata = {
  metadataBase: new URL("https://gobag.creditcardchris.com"),
  title,
  description,
  keywords: [
    "emergency kit",
    "go-bag checklist",
    "emergency preparedness",
    "household supplies",
  ],
  alternates: { canonical: "https://gobag.creditcardchris.com" },
  openGraph: {
    title,
    description,
    siteName: "GoBag",
    url: "https://gobag.creditcardchris.com",
    images: [
      {
        url: "/gobag/kit-illustration.svg",
        alt: "GoBag emergency supplies",
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
  appleWebApp: { title: "GoBag" },
};
export default function GoBagPage() {
  return <GoBag />;
}
