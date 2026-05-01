import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import AuthSessionProvider from "@/components/providers/SessionProvider";
import "./globals.css";

const bodyFont = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const displayFont = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tethread 🧶",
  description: "Handcrafted crochet pieces made with love",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FDF8F0] text-charcoal font-body">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
