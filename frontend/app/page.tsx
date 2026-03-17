"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessionHomePath, readSession } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const session = readSession();
    router.replace(session ? getSessionHomePath(session) : "/login");
  }, [router]);

  return <div className="min-h-screen" />;
}
