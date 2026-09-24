import type { Metadata } from "next";
import "./globals.css";
import { NO_FLASH_SCRIPT } from "@/lib/theme";
import { ThemeToggle } from "@/components/ThemeToggle";

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
      <head>
        {/* Applies the persisted theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="antialiased">
        <header className="flex justify-end p-4">
          <ThemeToggle />
        </header>
        {children}
      </body>
    </html>
  );
}
