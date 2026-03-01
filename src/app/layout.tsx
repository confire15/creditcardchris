import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Credit Card Chris - Maximize Your Credit Card Rewards",
  description: "Know exactly which card to use for every purchase. Track 84+ cards, earn more rewards, and sync your bank automatically. Free forever.",
  keywords: ["credit card rewards", "points optimizer", "cashback tracker", "travel rewards", "credit card comparison", "rewards tracking app"],
  authors: [{ name: "Credit Card Chris" }],
  metadataBase: new URL("https://creditcardchris.com"),
  openGraph: {
    title: "Credit Card Chris — Stop Leaving Points on the Table",
    description: "Know exactly which card to use for every purchase. Track 84+ cards, earn more rewards, and sync your bank automatically. Free forever.",
    url: "https://creditcardchris.com",
    siteName: "Credit Card Chris",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Credit Card Chris — Maximize Your Credit Card Rewards",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Credit Card Chris — Stop Leaving Points on the Table",
    description: "Know exactly which card to use for every purchase. Track 84+ cards, earn more rewards, and sync your bank automatically. Free forever.",
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
        <meta name="theme-color" content="#d4621a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
