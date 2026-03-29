export default function SuccessPage() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white px-5 pt-6 pb-10">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
              <span role="img" aria-label="bell">&#128276;</span>
            </div>
            <span className="font-bold text-lg tracking-tight">IMAX Alerts</span>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl mb-5">
            <span role="img" aria-label="party">&#127881;</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
            You are all set!
          </h1>
          <p className="text-white/80 text-sm sm:text-base leading-relaxed">
            Your alert is now active. Sit back — we will handle the rest.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-5 -mt-4">
        {/* How it works card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">
            What happens next
          </h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-indigo-600">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">We check every 15 minutes</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Our bot monitors BookMyShow around the clock for your selected movie and screens.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-indigo-600">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Bookings open? You will know first</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  The moment IMAX tickets appear, we send you an email with direct booking links.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-indigo-600">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">One and done</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  After we notify you, the alert automatically deactivates. No ongoing emails, no spam.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tip card */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <div className="flex gap-3">
            <span className="text-lg shrink-0" role="img" aria-label="lightbulb">&#128161;</span>
            <div>
              <p className="text-sm font-medium text-amber-900">Heads up</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Check your spam folder and add our email to contacts so you don&apos;t miss the alert when it matters.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <a
          href="/"
          className="block w-full text-center py-3 rounded-xl border-2 border-indigo-600 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition"
        >
          Set up another alert
        </a>
      </div>
    </div>
  );
}
