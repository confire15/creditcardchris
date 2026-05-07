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
  title: "Credit Card Chris - Optimize Your Rewards Wallet",
  description: "Know which card to use, track credits, offers, SUBs, points, annual fees, and card changes, then decide which premium cards are worth keeping.",
  keywords: ["credit card rewards", "points optimizer", "cashback tracker", "travel rewards", "credit card comparison", "rewards tracking app", "smart alerts", "credit card alerts", "annual fee reminder", "statement credit tracker", "sign up bonus tracker", "card offer tracker"],
  authors: [{ name: "Credit Card Chris" }],
  metadataBase: new URL("https://creditcardchris.com"),
  openGraph: {
    title: "Credit Card Chris - Optimize Your Rewards Wallet",
    description: "Know which card to use, track credits, offers, SUBs, points, annual fees, and card changes, then decide which premium cards are worth keeping.",
    url: "https://creditcardchris.com",
    siteName: "Credit Card Chris",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Credit Card Chris - Optimize Your Rewards Wallet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Credit Card Chris - Optimize Your Rewards Wallet",
    description: "Know which card to use, track credits, offers, SUBs, points, annual fees, and card changes, then decide which premium cards are worth keeping.",
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
