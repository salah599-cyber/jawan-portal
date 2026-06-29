"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AddLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild size="sm">
      <Link href={href}>{label}</Link>
    </Button>
  );
}
