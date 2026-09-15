import type { Metadata, Viewport } from "next";
import ReadyKit from "@/components/readykit/readykit";
const title = "Emergency Go-Bag Builder | ReadyKit";
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
    siteName: "ReadyKit",
    url: "https://gobag.creditcardchris.com",
    images: [
      {
        url: "/readykit/kit-illustration.svg",
        alt: "ReadyKit emergency supplies",
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/readykit/kit-illustration.svg"],
  },
  icons: { icon: "/readykit/icon.svg", apple: "/readykit/icon.svg" },
  manifest: null,
  appleWebApp: { title: "ReadyKit" },
};
export default function GoBagPage() {
  return <ReadyKit />;
}
