"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

function LoginForm() {
  const router = useRouter();
  const { status } = useSession();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      // Replace history state to prevent back button returning to login
      window.history.replaceState(null, "", callbackUrl);
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  // Prevent back button from showing cached login page after successful login
  useEffect(() => {
    const handlePopState = () => {
      // Force a check of authentication status
      router.refresh();
    };
    
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    const username = form.get("username") as string;

    try {
      if (isRegister) {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Registration failed");
        }
      }

      // Use Auth.js signIn helper to handle CSRF and session
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log("[Login] signIn result:", JSON.stringify(result));

      if (result?.error) {
        if (result.error === "Configuration") {
          throw new Error("System error. Please contact a developer.");
        }
        if (result.error === "AccessDenied") {
          throw new Error("Access denied. Please check your credentials.");
        }
        if (result.error === "CredentialsSignin") {
          throw new Error("Invalid email or password. Please try again.");
        }
        throw new Error(result.error || "Login failed");
      }

      if (result?.ok) {
        // Successful login - determine redirect URL
        let redirectUrl = "/";
        
        if (email.toLowerCase() === "dev@chatapp.com") {
          redirectUrl = "/dashboard";
        } else if (callbackUrl && !callbackUrl.includes("login")) {
          redirectUrl = callbackUrl;
        }
        
        // Replace history state so user can't go back to login page
        window.history.replaceState(null, "", redirectUrl);
        
        // Use router.push with refresh to ensure session is loaded
        router.push(redirectUrl);
        router.refresh();
      } else {
        throw new Error("Login failed. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  // Show loading while checking auth status
  if (status === "loading") {
    return (
      <div className="auth-container">
        <style jsx global>{globalStyles}</style>
        <div className="auth-card">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <style jsx global>{globalStyles}</style>

      <div className="auth-card">
        <h1 className="auth-title">
          {isRegister ? "Create Account" : "Welcome Back"}
        </h1>
        <p className="auth-subtitle">
          {isRegister
            ? "Start your journey with us today"
            : "Sign in to continue your journey"}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="input-group">
              <input
                name="username"
                type="text"
                placeholder="Username"
                required
                className="auth-input"
                autoComplete="username"
              />
            </div>
          )}

          <div className="input-group">
            <input
              name="email"
              type="email"
              placeholder="Email address"
              required
              className="auth-input"
              autoComplete="email"
            />
          </div>

          <div className="input-group password-group">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              minLength={6}
              className="auth-input"
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
            <button
              type="button"
              className="password-toggle"
              onMouseDown={() => setShowPassword(true)}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              onTouchStart={() => setShowPassword(true)}
              onTouchEnd={() => setShowPassword(false)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="auth-button"
          >
            {loading ? (
              <span className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            ) : (
              isRegister ? "Create Account" : "Sign In"
            )}
          </button>
        </form>

        <div className="auth-divider"></div>

        <button
          onClick={() => setIsRegister(!isRegister)}
          className="toggle-link"
        >
          {isRegister
            ? "Already have an account? Sign in"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-container">
        <style jsx global>{globalStyles}</style>
        <div className="auth-card">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;700&display=swap');

  .auth-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: linear-gradient(135deg, #222831 0%, #393E46 50%, #222831 100%);
    position: relative;
    overflow: hidden;
  }

  .auth-container::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at 30% 40%, rgba(148, 137, 121, 0.12) 0%, transparent 50%),
                radial-gradient(circle at 70% 60%, rgba(223, 208, 184, 0.08) 0%, transparent 50%);
    animation: gradientShift 15s ease infinite;
  }

  @keyframes gradientShift {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    50% { transform: translate(-5%, -5%) rotate(5deg); }
  }

  .auth-card {
    position: relative;
    width: 100%;
    max-width: 440px;
    background: rgba(34, 40, 49, 0.85);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(223, 208, 184, 0.1);
    border-radius: 20px;
    padding: 3rem 2.5rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5),
                0 0 0 1px rgba(223, 208, 184, 0.05) inset;
    animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .auth-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(223, 208, 184, 0.5), transparent);
    border-radius: 20px 20px 0 0;
  }

  .auth-title {
    font-family: 'DM Serif Display', serif;
    font-size: 2rem;
    font-weight: 400;
    color: #DFD0B8;
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.02em;
    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s backwards;
  }

  .auth-subtitle {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem;
    color: rgba(223, 208, 184, 0.55);
    margin: 0 0 2.5rem 0;
    font-weight: 400;
    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s backwards;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s backwards;
  }

  .input-group {
    position: relative;
  }

  .auth-input {
    font-family: 'DM Sans', sans-serif;
    width: 100%;
    padding: 1rem 1.25rem;
    background: rgba(57, 62, 70, 0.4);
    border: 1px solid rgba(223, 208, 184, 0.1);
    border-radius: 12px;
    color: #DFD0B8;
    font-size: 0.95rem;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
  }

  .password-group {
    position: relative;
  }

  .password-group .auth-input {
    padding-right: 3rem;
  }

  .password-toggle {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    padding: 0.35rem;
    cursor: pointer;
    color: rgba(223, 208, 184, 0.35);
    transition: color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }

  .password-toggle:hover {
    color: rgba(223, 208, 184, 0.7);
  }

  .auth-input::placeholder {
    color: rgba(223, 208, 184, 0.35);
  }

  .auth-input:focus {
    background: rgba(57, 62, 70, 0.6);
    border-color: rgba(223, 208, 184, 0.35);
    box-shadow: 0 0 0 4px rgba(223, 208, 184, 0.08);
    transform: translateY(-1px);
  }

  .auth-input:hover:not(:focus) {
    border-color: rgba(223, 208, 184, 0.18);
  }

  .error-message {
    font-family: 'DM Sans', sans-serif;
    color: #ef4444;
    font-size: 0.85rem;
    padding: 0.75rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    margin: -0.5rem 0 0 0;
    animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }

  .auth-button {
    font-family: 'DM Sans', sans-serif;
    width: 100%;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, #948979 0%, #DFD0B8 100%);
    border: none;
    border-radius: 12px;
    color: #222831;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
    margin-top: 0.5rem;
    box-shadow: 0 4px 20px rgba(148, 137, 121, 0.3);
  }

  .auth-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s;
  }

  .auth-button:hover::before {
    left: 100%;
  }

  .auth-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 30px rgba(148, 137, 121, 0.4);
  }

  .auth-button:active {
    transform: translateY(0);
  }

  .auth-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .auth-divider {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1.5rem 0;
    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s backwards;
  }

  .auth-divider::before,
  .auth-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(223, 208, 184, 0.15), transparent);
  }

  .toggle-link {
    font-family: 'DM Sans', sans-serif;
    width: 100%;
    text-align: center;
    padding: 0.75rem;
    background: none;
    border: none;
    color: rgba(223, 208, 184, 0.5);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s backwards;
  }

  .toggle-link::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(223, 208, 184, 0.7), transparent);
    transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .toggle-link:hover {
    color: #DFD0B8;
  }

  .toggle-link:hover::after {
    width: 60%;
  }

  .loading-dots {
    display: inline-flex;
    gap: 4px;
    align-items: center;
    justify-content: center;
  }

  .loading-dots span {
    width: 4px;
    height: 4px;
    background: currentColor;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .loading-dots span:nth-child(1) {
    animation-delay: -0.32s;
  }

  .loading-dots span:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @media (max-width: 640px) {
    .auth-card {
      padding: 2rem 1.5rem;
    }

    .auth-title {
      font-size: 1.75rem;
    }
  }
`;
