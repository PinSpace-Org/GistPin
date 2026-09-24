import type { Metadata } from "next";
import "./globals.css";
import { SwrProvider } from "@/components/SwrProvider";

export const metadata: Metadata = {
  title: "GistPin Analytics",
  description:
    "Analytics dashboards for GistPin: geospatial activity, content lifecycle, moderation and on-chain health.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SwrProvider>{children}</SwrProvider>
      </body>
    </html>
  );
}
