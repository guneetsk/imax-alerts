"use client";

import { useState, useEffect, useMemo } from "react";
import imaxScreens from "@/lib/data/imax-screens.json";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */
const allScreens = imaxScreens as Screen[];

const screensByCity = allScreens.reduce(
  (acc, s) => {
    if (!acc[s.city]) acc[s.city] = [];
    acc[s.city].push(s);
    return acc;
  },
  {} as Record<string, Screen[]>,
);

const cities = Object.keys(screensByCity).sort();

/* Popular cities shown first as quick-pick chips */
const popularCities = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Gurugram",
  "Kolkata",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function generateDateOptions() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const code =
      d.getFullYear().toString() +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    const dayLabel = d.toLocaleDateString("en-IN", { weekday: "short" });
    const dateLabel = d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
    const isToday = i === 0;
    const isTomorrow = i === 1;
    return { code, dayLabel, dateLabel, isToday, isTomorrow };
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function Home() {
  /* API state */
  const [movies, setMovies] = useState<Movie[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(true);

  /* Form state */
  const [step, setStep] = useState(1);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [anyDate, setAnyDate] = useState(true);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* City search */
  const [citySearch, setCitySearch] = useState("");

  const dateOptions = useMemo(() => generateDateOptions(), []);

  /* Fetch movies */
  useEffect(() => {
    fetch("/api/movies")
      .then((r) => r.json())
      .then((data) => {
        setMovies(data.movies || []);
        setMoviesLoading(false);
      })
      .catch(() => setMoviesLoading(false));
  }, []);

  /* When "any date" is on, select all 14 dates */
  useEffect(() => {
    if (anyDate) {
      setSelectedDates(dateOptions.map((d) => d.code));
    }
  }, [anyDate, dateOptions]);

  /* Derived: filtered cities for search */
  const filteredCities = citySearch
    ? cities.filter((c) => c.toLowerCase().includes(citySearch.toLowerCase()))
    : [];

  /* Derived: screens for selected city */
  const cityScreens = selectedCity ? screensByCity[selectedCity] || [] : [];

  /* Derived: summary of selected venues by city */
  const venuesByCity = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const vc of selectedVenues) {
      const screen = allScreens.find((s) => s.venueCode === vc);
      if (screen) {
        if (!map[screen.city]) map[screen.city] = [];
        map[screen.city].push(screen.name);
      }
    }
    return map;
  }, [selectedVenues]);

  /* ---- Toggles ---- */
  function toggleDate(code: string) {
    setSelectedDates((prev) =>
      prev.includes(code) ? prev.filter((d) => d !== code) : [...prev, code],
    );
  }

  function toggleVenue(venueCode: string) {
    setSelectedVenues((prev) =>
      prev.includes(venueCode)
        ? prev.filter((v) => v !== venueCode)
        : [...prev, venueCode],
    );
  }

  function toggleAllInCity(city: string) {
    const cityVenues = (screensByCity[city] || []).map((s) => s.venueCode);
    const allSelected = cityVenues.every((vc) => selectedVenues.includes(vc));
    if (allSelected) {
      setSelectedVenues((prev) =>
        prev.filter((vc) => !cityVenues.includes(vc)),
      );
    } else {
      setSelectedVenues((prev) => [
        ...prev,
        ...cityVenues.filter((vc) => !prev.includes(vc)),
      ]);
    }
  }

  /* ---- Navigation ---- */
  function canGoNext() {
    if (step === 1) return !!selectedMovie;
    if (step === 2) return selectedVenues.length > 0 && selectedDates.length > 0;
    return false;
  }

  /* ---- Submit ---- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedMovie) return setError("Pick a movie first.");
    if (selectedDates.length === 0)
      return setError("Select at least one date.");
    if (selectedVenues.length === 0)
      return setError("Select at least one screen.");
    if (!email) return setError("We need your email to send the alert.");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return setError("That doesn't look like a valid email.");

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
        setError(data.error || "Something went wrong. Try again?");
        setLoading(false);
        return;
      }
      window.location.href = `/verify?sub=${data.subscriptionId}&email=${encodeURIComponent(email)}`;
    } catch {
      setError("Could not reach our servers. Check your connection.");
      setLoading(false);
    }
  }

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* ---- Hero / Header ---- */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white px-5 pt-6 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
              <span role="img" aria-label="bell">&#128276;</span>
            </div>
            <span className="font-bold text-lg tracking-tight">IMAX Alerts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
            Never miss an IMAX opening
          </h1>
          <p className="text-white/80 text-sm sm:text-base leading-relaxed">
            We check BookMyShow every 15 minutes and ping you the moment tickets
            drop for your movie.
          </p>
        </div>
      </div>

      {/* ---- Progress bar ---- */}
      <div className="max-w-lg mx-auto w-full px-5 -mt-3">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-1 mb-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1 flex flex-col items-center">
                <div
                  className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
                    s <= step ? "bg-indigo-600" : "bg-gray-200"
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 px-1">
            <span className={step >= 1 ? "text-indigo-600 font-medium" : ""}>
              Movie
            </span>
            <span className={step >= 2 ? "text-indigo-600 font-medium" : ""}>
              Where & When
            </span>
            <span className={step >= 3 ? "text-indigo-600 font-medium" : ""}>
              Get Alerts
            </span>
          </div>
        </div>
      </div>

      {/* ---- Form area ---- */}
      <div className="flex-1 max-w-lg mx-auto w-full px-5 pt-5 pb-32">
        <form onSubmit={handleSubmit}>
          {/* ============ STEP 1: Movie ============ */}
          {step === 1 && (
            <div className="step-enter space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  What are you watching?
                </h2>
                <p className="text-sm text-gray-500">
                  Pick the movie you want IMAX tickets for.
                </p>
              </div>

              {moviesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-xl bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : movies.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="text-4xl mb-3">
                    <span role="img" aria-label="popcorn">&#127871;</span>
                  </div>
                  <p className="text-gray-500 font-medium mb-1">
                    No IMAX movies right now
                  </p>
                  <p className="text-gray-400 text-sm">
                    Check back in a few hours — new movies show up as BookMyShow
                    lists them.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {movies.map((m) => {
                    const isSelected =
                      selectedMovie?.eventCode === m.eventCode;
                    return (
                      <button
                        key={m.eventCode}
                        type="button"
                        onClick={() => setSelectedMovie(m)}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/20"
                            : "border-gray-200 bg-white hover:border-gray-300 active:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-medium text-[15px] ${
                              isSelected ? "text-indigo-700" : "text-gray-900"
                            }`}
                          >
                            {m.eventName}
                          </span>
                          {isSelected && (
                            <svg
                              className="w-5 h-5 text-indigo-600 shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============ STEP 2: Screens & Dates ============ */}
          {step === 2 && (
            <div className="step-enter space-y-6">
              {/* -- City & Screen Selection -- */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Which IMAX screens?
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Pick your city, then select the screens you want alerts for.
                </p>

                {/* Selected venues summary */}
                {selectedVenues.length > 0 && !selectedCity && (
                  <div className="mb-4 space-y-2">
                    {Object.entries(venuesByCity).map(([city, names]) => (
                      <div
                        key={city}
                        className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-indigo-700">
                            {city}
                          </span>
                          <span className="text-xs text-indigo-500">
                            {names.length}{" "}
                            {names.length === 1 ? "screen" : "screens"}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-600/70 mt-0.5 truncate">
                          {names.join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* City drill-down or city picker */}
                {selectedCity ? (
                  /* -- Showing screens for a city -- */
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedCity(null)}
                      className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium mb-3 hover:text-indigo-700"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      All cities
                    </button>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      {/* Select all toggle */}
                      <button
                        type="button"
                        onClick={() => toggleAllInCity(selectedCity)}
                        className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          All screens in {selectedCity}
                        </span>
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                            cityScreens.every((s) =>
                              selectedVenues.includes(s.venueCode),
                            )
                              ? "bg-indigo-600 border-indigo-600"
                              : "border-gray-300"
                          }`}
                        >
                          {cityScreens.every((s) =>
                            selectedVenues.includes(s.venueCode),
                          ) && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </button>

                      {/* Individual screens */}
                      {cityScreens.map((s, idx) => {
                        const checked = selectedVenues.includes(s.venueCode);
                        return (
                          <button
                            key={s.venueCode}
                            type="button"
                            onClick={() => toggleVenue(s.venueCode)}
                            className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition ${
                              idx < cityScreens.length - 1
                                ? "border-b border-gray-100"
                                : ""
                            }`}
                          >
                            <span
                              className={`text-sm ${
                                checked
                                  ? "text-indigo-700 font-medium"
                                  : "text-gray-700"
                              }`}
                            >
                              {s.name}
                            </span>
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                                checked
                                  ? "bg-indigo-600 border-indigo-600"
                                  : "border-gray-300"
                              }`}
                            >
                              {checked && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* -- City picker -- */
                  <div>
                    {/* Search */}
                    <div className="relative mb-3">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search city..."
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-400 transition"
                      />
                    </div>

                    {/* Search results */}
                    {citySearch && (
                      <div className="mb-4">
                        {filteredCities.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">
                            No IMAX screens in &ldquo;{citySearch}&rdquo;
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {filteredCities.map((city) => {
                              const count = screensByCity[city].length;
                              const selectedCount = screensByCity[city].filter(
                                (s) => selectedVenues.includes(s.venueCode),
                              ).length;
                              return (
                                <button
                                  key={city}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCity(city);
                                    setCitySearch("");
                                  }}
                                  className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition"
                                >
                                  <span className="text-sm font-medium text-gray-900">
                                    {city}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {selectedCount > 0 && (
                                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                        {selectedCount} selected
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-400">
                                      {count} {count === 1 ? "screen" : "screens"}
                                    </span>
                                    <svg
                                      className="w-4 h-4 text-gray-300"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Popular cities grid */}
                    {!citySearch && (
                      <>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                          Popular cities
                        </p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {popularCities.map((city) => {
                            const count = screensByCity[city]?.length || 0;
                            const selectedCount = (
                              screensByCity[city] || []
                            ).filter((s) =>
                              selectedVenues.includes(s.venueCode),
                            ).length;
                            return (
                              <button
                                key={city}
                                type="button"
                                onClick={() => setSelectedCity(city)}
                                className={`relative flex flex-col items-start px-3.5 py-3 rounded-xl border transition-all ${
                                  selectedCount > 0
                                    ? "border-indigo-200 bg-indigo-50"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                              >
                                <span
                                  className={`text-sm font-medium ${
                                    selectedCount > 0
                                      ? "text-indigo-700"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {city}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  {count} {count === 1 ? "screen" : "screens"}
                                </span>
                                {selectedCount > 0 && (
                                  <span className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {selectedCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Other cities */}
                        {cities.filter((c) => !popularCities.includes(c))
                          .length > 0 && (
                          <>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                              Other cities
                            </p>
                            <div className="space-y-1.5">
                              {cities
                                .filter((c) => !popularCities.includes(c))
                                .map((city) => {
                                  const count = screensByCity[city].length;
                                  const selectedCount = screensByCity[
                                    city
                                  ].filter((s) =>
                                    selectedVenues.includes(s.venueCode),
                                  ).length;
                                  return (
                                    <button
                                      key={city}
                                      type="button"
                                      onClick={() => setSelectedCity(city)}
                                      className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition"
                                    >
                                      <span className="text-sm text-gray-900">
                                        {city}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {selectedCount > 0 && (
                                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                            {selectedCount}
                                          </span>
                                        )}
                                        <span className="text-xs text-gray-400">
                                          {count}
                                        </span>
                                        <svg
                                          className="w-4 h-4 text-gray-300"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                          strokeWidth={2}
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M9 5l7 7-7 7"
                                          />
                                        </svg>
                                      </div>
                                    </button>
                                  );
                                })}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200" />

              {/* -- Date Selection -- */}
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Which dates?
                </h2>

                {/* Any date option */}
                <button
                  type="button"
                  onClick={() => setAnyDate(true)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border mb-2 transition-all ${
                    anyDate
                      ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/20"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-left">
                    <span
                      className={`text-sm font-medium ${
                        anyDate ? "text-indigo-700" : "text-gray-900"
                      }`}
                    >
                      Any date in the next 2 weeks
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Recommended — you will not miss a thing
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                      anyDate
                        ? "bg-indigo-600 border-indigo-600"
                        : "border-gray-300"
                    }`}
                  >
                    {anyDate && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>

                {/* Pick specific dates option */}
                <button
                  type="button"
                  onClick={() => {
                    setAnyDate(false);
                    setSelectedDates([]);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border mb-3 transition-all ${
                    !anyDate
                      ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/20"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="text-left">
                    <span
                      className={`text-sm font-medium ${
                        !anyDate ? "text-indigo-700" : "text-gray-900"
                      }`}
                    >
                      Pick specific dates
                    </span>
                    {!anyDate && selectedDates.length > 0 && (
                      <p className="text-xs text-indigo-500 mt-0.5">
                        {selectedDates.length} {selectedDates.length === 1 ? "date" : "dates"} selected
                      </p>
                    )}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                      !anyDate
                        ? "bg-indigo-600 border-indigo-600"
                        : "border-gray-300"
                    }`}
                  >
                    {!anyDate && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>

                {/* Specific date chips — shown when "Pick specific dates" is selected */}
                {!anyDate && (
                  <div className="flex flex-wrap gap-2">
                    {dateOptions.map((d) => {
                      const selected = selectedDates.includes(d.code);
                      return (
                        <button
                          key={d.code}
                          type="button"
                          onClick={() => toggleDate(d.code)}
                          className={`flex flex-col items-center px-3 py-2 rounded-xl border text-center min-w-[60px] transition-all ${
                            selected
                              ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600/20"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <span
                            className={`text-[10px] uppercase font-medium ${
                              selected ? "text-indigo-600" : "text-gray-400"
                            }`}
                          >
                            {d.isToday
                              ? "Today"
                              : d.isTomorrow
                                ? "Tmrw"
                                : d.dayLabel}
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              selected ? "text-indigo-700" : "text-gray-700"
                            }`}
                          >
                            {d.dateLabel.split(" ")[1]}
                          </span>
                          <span
                            className={`text-[10px] ${
                              selected ? "text-indigo-500" : "text-gray-400"
                            }`}
                          >
                            {d.dateLabel.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============ STEP 3: Email ============ */}
          {step === 3 && (
            <div className="step-enter space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Where should we send the alert?
                </h2>
                <p className="text-sm text-gray-500">
                  We will email you the instant bookings open. That is it — no
                  spam, no newsletter.
                </p>
              </div>

              {/* Summary card */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm" role="img" aria-label="movie">&#127916;</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Movie
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedMovie?.eventName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm" role="img" aria-label="screen">&#127917;</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Screens
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedVenues.length}{" "}
                      {selectedVenues.length === 1 ? "screen" : "screens"} in{" "}
                      {Object.keys(venuesByCity).length}{" "}
                      {Object.keys(venuesByCity).length === 1
                        ? "city"
                        : "cities"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-sm" role="img" aria-label="calendar">&#128197;</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Dates
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {anyDate
                        ? "Any date in the next 2 weeks"
                        : `${selectedDates.length} ${selectedDates.length === 1 ? "date" : "dates"} selected`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Your email
                </label>
                <input
                  type="email"
                  placeholder="you@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-400 transition"
                />
              </div>
            </div>
          )}

          {/* ---- Error ---- */}
          {error && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </form>
      </div>

      {/* ---- Fixed bottom bar ---- */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200 px-5 py-4 z-50">
        <div className="max-w-lg mx-auto flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => {
                setError("");
                setSelectedCity(null);
                setStep(step - 1);
              }}
              className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              disabled={!canGoNext()}
              onClick={() => {
                setError("");
                setSelectedCity(null);
                setStep(step + 1);
              }}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === 1 ? "Next — Pick screens" : "Next — Enter email"}
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || !email}
              onClick={(e) =>
                handleSubmit(e as unknown as React.FormEvent)
              }
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
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
                  Sending verification code...
                </span>
              ) : (
                "Set up my alert"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
