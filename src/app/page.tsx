"use client";

import { useState, useEffect } from "react";
import imaxScreens from "@/lib/data/imax-screens.json";

interface Movie {
  eventCode: string;
  eventName: string;
}

interface Screen {
  id: string;
  name: string;
  city: string;
  state: string;
  venueCode: string;
  regionCode: string;
}

// Group screens by city
const screensByCity = (imaxScreens as Screen[]).reduce(
  (acc, s) => {
    if (!acc[s.city]) acc[s.city] = [];
    acc[s.city].push(s);
    return acc;
  },
  {} as Record<string, Screen[]>
);
const cities = Object.keys(screensByCity).sort();

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [moviesLoading, setMoviesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/movies")
      .then((r) => r.json())
      .then((data) => {
        setMovies(data.movies || []);
        setMoviesLoading(false);
      })
      .catch(() => setMoviesLoading(false));
  }, []);

  // Generate next 14 dates
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const code =
      d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    const label = d.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    return { code, label };
  });

  function toggleDate(code: string) {
    setSelectedDates((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code]
    );
  }

  function toggleVenue(venueCode: string) {
    setSelectedVenues((prev) =>
      prev.includes(venueCode)
        ? prev.filter((v) => v !== venueCode)
        : [...prev, venueCode]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedMovie) return setError("Select a movie.");
    if (selectedDates.length === 0) return setError("Select at least one date.");
    if (selectedVenues.length === 0)
      return setError("Select at least one screen.");
    if (!email) return setError("Enter your email.");

    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          movieEventCode: selectedMovie.eventCode,
          movieName: selectedMovie.eventName,
          venueCodes: selectedVenues,
          targetDates: selectedDates,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      // Redirect to verify page with subscriptionId and email
      window.location.href = `/verify?sub=${data.subscriptionId}&email=${encodeURIComponent(email)}`;
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">
          Get notified when IMAX bookings open
        </h1>
        <p className="text-gray-500">
          Pick a movie, dates, and screens. We will email you the moment bookings
          go live.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Movie picker */}
        <div>
          <label className="block text-sm font-medium mb-1">Movie</label>
          {moviesLoading ? (
            <p className="text-gray-400 text-sm">Loading movies...</p>
          ) : movies.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No IMAX movies found. Check back later.
            </p>
          ) : (
            <select
              className="w-full border rounded-lg px-3 py-2 bg-white"
              value={selectedMovie?.eventCode || ""}
              onChange={(e) => {
                const m = movies.find((m) => m.eventCode === e.target.value);
                setSelectedMovie(m || null);
              }}
            >
              <option value="">Select a movie...</option>
              {movies.map((m) => (
                <option key={m.eventCode} value={m.eventCode}>
                  {m.eventName}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Date picker */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Dates{" "}
            <span className="text-gray-400 font-normal">
              (select one or more)
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {dateOptions.map((d) => (
              <button
                key={d.code}
                type="button"
                onClick={() => toggleDate(d.code)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  selectedDates.includes(d.code)
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white border-gray-300 hover:border-gray-400"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Screen picker */}
        <div>
          <label className="block text-sm font-medium mb-1">
            IMAX Screens{" "}
            <span className="text-gray-400 font-normal">
              (select one or more)
            </span>
          </label>
          <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3 bg-white">
            {cities.map((city) => (
              <div key={city}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  {city}
                </p>
                {screensByCity[city].map((s) => (
                  <label
                    key={s.venueCode}
                    className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 px-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedVenues.includes(s.venueCode)}
                      onChange={() => toggleVenue(s.venueCode)}
                      className="accent-red-600"
                    />
                    <span className="text-sm">{s.name}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 text-white font-medium py-2.5 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
        >
          {loading ? "Sending OTP..." : "Get Alert"}
        </button>
      </form>
    </div>
  );
}
