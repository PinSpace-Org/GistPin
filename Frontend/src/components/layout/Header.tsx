"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import Image from "next/image";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-around  bg-[--header-background] backdrop-blur-sm">
      <Link href="/" className="flex items-center ">
        <Image
          src="/gistPin-header-logo.png"
          alt="GistPin Logo"
          width={100}
          height={100}
        />{" "}
      </Link>
      <nav className="flex items-center space-x-4">
        {/* You can update these links too, e.g., text-[--foreground-muted] */}
        <Link
          href="/map"
          className="text-gray-600 transition-colors dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"
        >
          <MapPin className="w-10 h-12  text-blue-500" />
        </Link>
      </nav>
    </header>
  );
}
