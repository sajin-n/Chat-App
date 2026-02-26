"use client";

import { useState, useEffect } from "react";

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade-out after 2 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    // Remove splash after fade completes
    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!showSplash) return <>{children}</>;

  return (
    <>
      {/* Splash overlay */}
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-600 ${
          fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        style={{ background: "linear-gradient(135deg, #222831 0%, #393E46 50%, #222831 100%)" }}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, rgba(223,208,184,0.3) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Logo + Chat icon */}
        <div className="relative flex flex-col items-center gap-6 animate-[splashIn_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]">
          {/* Chat icon */}
          <div className="relative">
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#DFD0B8"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-60"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {/* Subtle dot accent */}
            <div
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
              style={{ background: "#DFD0B8" }}
            />
          </div>

          {/* App name */}
          <h1
            className="text-6xl sm:text-7xl font-bold tracking-tight select-none"
            style={{
              fontFamily: "'DM Serif Display', serif",
              color: "#DFD0B8",
              textShadow: "0 2px 40px rgba(223,208,184,0.2)",
            }}
          >
            PaBlo
          </h1>

          {/* Tagline */}
          <p
            className="text-sm tracking-widest uppercase opacity-50"
            style={{ color: "#948979", fontFamily: "'DM Sans', sans-serif" }}
          >
            Connect &middot; Share &middot; Chat
          </p>
        </div>

        {/* Loading bar */}
        <div className="mt-12 w-48 h-1 rounded-full overflow-hidden" style={{ background: "rgba(148,137,121,0.2)" }}>
          <div
            className="h-full rounded-full animate-[loadBar_2s_cubic-bezier(0.4,0,0.2,1)_forwards]"
            style={{
              background: "linear-gradient(90deg, #948979, #DFD0B8)",
            }}
          />
        </div>
      </div>

      {/* Render children behind splash so they start loading */}
      <div className={fadeOut ? "opacity-100 transition-opacity duration-600" : "opacity-0"}>
        {children}
      </div>

      {/* Keyframes */}
      <style jsx global>{`
        @keyframes splashIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes loadBar {
          0% { width: 0%; }
          60% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
    </>
  );
}
