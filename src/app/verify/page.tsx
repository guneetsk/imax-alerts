"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyForm() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const subscriptionId = params.get("sub") || "";

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* Auto-focus first input */
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      e.preventDefault();
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || "";
      }
      setDigits(newDigits);
      const nextEmpty = newDigits.findIndex((d) => !d);
      const focusIdx = nextEmpty === -1 ? 5 : nextEmpty;
      inputRefs.current[focusIdx]?.focus();
    }
  }

  const code = digits.join("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError("Enter all 6 digits.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, subscriptionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed. Check your code.");
        setLoading(false);
        return;
      }
      window.location.href = "/success";
    } catch {
      setError("Could not reach our servers. Check your connection.");
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setResent(false);
    try {
      const res = await fetch("/api/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      if (res.ok) {
        setResent(true);
        setTimeout(() => setResent(false), 4000);
      } else {
        const data = await res.json();
        setError(data.error || "Could not resend. Try again.");
      }
    } catch {
      setError("Network error. Check your connection.");
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white px-5 pt-6 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
              <span role="img" aria-label="bell">&#128276;</span>
            </div>
            <span className="font-bold text-lg tracking-tight">IMAX Alerts</span>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl mb-4">
            <span role="img" aria-label="email">&#9993;&#65039;</span>
          </div>
          <h1 className="text-2xl font-bold leading-tight mb-1">
            Check your inbox
          </h1>
          <p className="text-white/80 text-sm leading-relaxed">
            We sent a 6-digit code to <strong className="text-white">{email}</strong>
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 max-w-lg mx-auto w-full px-5 pt-8 pb-32">
        <form onSubmit={handleVerify} className="space-y-6">
          {/* 6-digit input boxes */}
          <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 bg-white transition-all focus:outline-none ${
                  digit
                    ? "border-indigo-600 text-indigo-700"
                    : "border-gray-200 text-gray-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-600/20"
                }`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Resent confirmation */}
          {resent && (
            <div className="px-4 py-3 bg-green-50 border border-green-100 rounded-xl">
              <p className="text-sm text-green-700">New code sent! Check your inbox.</p>
            </div>
          )}

          {/* Resend link */}
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">
              Did not get the email?
            </p>
            <button
              type="button"
              onClick={handleResend}
              className="text-sm text-indigo-600 font-medium hover:text-indigo-700 transition"
            >
              Send a new code
            </button>
          </div>
        </form>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 px-5 py-4 z-50">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            disabled={loading || code.length < 6}
            onClick={(e) =>
              handleVerify(e as unknown as React.FormEvent)
            }
            className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Verifying...
              </span>
            ) : (
              "Verify and activate alert"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[100dvh]">
          <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
