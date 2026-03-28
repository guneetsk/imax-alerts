"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyForm() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const subscriptionId = params.get("sub") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
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
        setError(data.error || "Verification failed.");
        setLoading(false);
        return;
      }
      window.location.href = "/success";
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    try {
      const res = await fetch("/api/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setError("New code sent!");
      } else {
        setError(data.error || "Could not resend.");
      }
    } catch {
      setError("Network error.");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
      <p className="text-gray-500 mb-6">
        We sent a 6-digit code to <strong>{email}</strong>
      </p>

      <form onSubmit={handleVerify} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="w-full border rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono"
          autoFocus
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>

      <button
        onClick={handleResend}
        className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
      >
        Resend code
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <VerifyForm />
    </Suspense>
  );
}
