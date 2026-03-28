export default function SuccessPage() {
  return (
    <div className="w-full max-w-sm text-center">
      <div className="text-5xl mb-4">&#9989;</div>
      <h1 className="text-2xl font-bold mb-2">Alert is active!</h1>
      <p className="text-gray-500 mb-6">
        We are now checking BookMyShow every 15 minutes. The moment IMAX bookings
        open for your selected movie and screen(s), you will get an email with
        booking links.
      </p>
      <p className="text-sm text-gray-400">
        This alert will automatically deactivate after we notify you. You can
        also unsubscribe anytime via the link in the email.
      </p>
      <a
        href="/"
        className="inline-block mt-6 text-red-600 font-medium hover:underline"
      >
        Set up another alert
      </a>
    </div>
  );
}
