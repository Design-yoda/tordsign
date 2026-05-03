import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ember">Not found</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        The document or signing link could not be found.
      </h1>
      <Link
        href="/"
        className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white"
      >
        Return home
      </Link>
    </main>
  );
}
