"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import NotificationCenter from "./NotificationCenter";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider refetchOnWindowFocus={true} refetchInterval={5 * 60}>
      <NotificationCenter />
      {children}
    </SessionProvider>
  );
}
