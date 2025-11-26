"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

const sizes = {
  sm: { width: 24, height: 24 },
  md: { width: 32, height: 32 },
  lg: { width: 40, height: 40 },
  xl: { width: 48, height: 48 },
};

export function OpulentLogo({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <Image
      src="/opulent.svg"
      alt="Opulent Logo"
      width={sizes[size].width}
      height={sizes[size].height}
      className={cn("shrink-0", className)}
      priority
    />
  );
}
