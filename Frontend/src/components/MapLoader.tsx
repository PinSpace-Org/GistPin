"use client"; // This marks the component as a Client Component

import dynamic from "next/dynamic";
import { useMemo } from "react";

export default function MapLoader() {
  // The useMemo and dynamic import logic is now safely inside a Client Component
  const Map = useMemo(
    () =>
      dynamic(() => import("@/components/Map"), {
        loading: () => <p>Map is loading...</p>,
        ssr: false, // This is allowed here!
      }),
    []
  );

  return <Map />;
}