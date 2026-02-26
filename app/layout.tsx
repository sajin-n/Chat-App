import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import SplashScreen from "@/components/SplashScreen";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";

export const metadata: Metadata = {
  title: "PaBlo",
  description: "Connect · Share · Chat",
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
          <SplashScreen>
            {children}
          </SplashScreen>
        </Providers>
      </body>
    </html>
  );
}
