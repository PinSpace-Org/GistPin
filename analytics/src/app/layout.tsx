import type { Metadata } from "next";
import "./globals.css";
import { SwrProvider } from "@/components/SwrProvider";
import { NO_FLASH_SCRIPT } from "@/lib/theme";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="antialiased">
        <SwrProvider>{children}</SwrProvider>
      </body>
    </html>
  );
}