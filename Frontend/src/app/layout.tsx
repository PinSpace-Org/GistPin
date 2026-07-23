import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GistPin — Location-Aware Micro-Messaging on Stellar",
  description:
    "Post short, anonymous, geotagged messages (\"gists\") anchored to real-world coordinates, and discover hyperlocal tips, alerts, and conversations happening around you.",
  icons: {
    icon: "/gistPin-header-logo.png",
  },
  openGraph: {
    title: "GistPin — Location-Aware Micro-Messaging on Stellar",
    description:
      "Anonymous, hyperlocal messaging anchored on the Stellar network.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
