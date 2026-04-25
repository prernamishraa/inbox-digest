import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans } from "next/font/google";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Inbox Digest — Stop missing the best of Substack",
  description:
    "Paste your Substack profile. Get a daily digest of the best posts from your subscriptions, curated by AI and delivered to your inbox.",
  openGraph: {
    title: "Inbox Digest — Stop missing the best of Substack",
    description:
      "One curated digest, every morning, in your inbox. Built for Substack readers.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${dmSans.variable}`}
    >
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
