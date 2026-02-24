import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";

export const metadata: Metadata = {
  title: "Chat",
  description: "Minimal chat app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
