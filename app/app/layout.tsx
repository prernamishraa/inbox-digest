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
  weight: ["300", "400", "500"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Inbox Digest — Stop reading. Start knowing.",
  description:
    "Inbox Digest sits in your Gmail, reads every newsletter you are subscribed to, and sends you one clean digest every morning.",
  openGraph: {
    title: "Inbox Digest — Stop reading. Start knowing.",
    description:
      "One clean digest every morning. You get the signal. The AI takes the noise.",
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
