export default function Home() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold">Cassandra Labs</h1>
      <p className="mt-2 text-gray-600">
        Join and vote on open-source fintech research.
      </p>

      <div className="mt-10 space-y-4">
        {/* New members */}
        <a
          href="/membership"
          className="block rounded-lg bg-blue-600 px-5 py-4 text-center font-medium text-white transition-colors hover:bg-blue-700"
        >
          Become a member
        </a>

        {/* Returning members */}
        <a
          href="/login"
          className="block rounded-lg border border-gray-300 px-5 py-4 text-center font-medium text-gray-900 transition-colors hover:bg-gray-50"
        >
          Log in
        </a>
      </div>

      <p className="mt-8 text-center text-sm text-gray-500">
        Already signed up but haven't paid your $1 dues? Log in to finish.
      </p>
    </main>
  );
}
