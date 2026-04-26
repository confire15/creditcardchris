import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d4621a",
};

export const metadata: Metadata = {
  title: "Credit Card Chris - Know Which Card to Use",
  description: "Know which card to use, track credits and annual fees, and decide which premium cards are worth keeping. Premium adds Smart Alerts by push, email, and SMS.",
  keywords: ["credit card rewards", "points optimizer", "cashback tracker", "travel rewards", "credit card comparison", "rewards tracking app", "smart alerts", "credit card alerts", "annual fee reminder"],
  authors: [{ name: "Credit Card Chris" }],
  metadataBase: new URL("https://creditcardchris.com"),
  openGraph: {
    title: "Credit Card Chris - Know Which Card to Use",
    description: "Know which card to use, track credits and annual fees, and decide which premium cards are worth keeping. Premium adds Smart Alerts by push, email, and SMS.",
    url: "https://creditcardchris.com",
    siteName: "Credit Card Chris",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Credit Card Chris - Know Which Card to Use",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Credit Card Chris - Know Which Card to Use",
    description: "Know which card to use, track credits and annual fees, and decide which premium cards are worth keeping. Premium adds Smart Alerts by push, email, and SMS.",
    images: ["/opengraph-image"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Credit Card Chris",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.className} ${spaceGrotesk.variable} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
