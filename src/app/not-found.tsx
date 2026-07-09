import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center text-white">
      <h2 className="text-4xl font-bold text-indigo-400">404</h2>
      <p className="mt-4 text-slate-400">The sector you are looking for does not exist in our registry.</p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white hover:bg-indigo-500"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
