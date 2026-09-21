import Link from "next/link";

export function FloatingSupportButton() {
  return (
    <Link
      href="/support"
      aria-label="Open Help & Support"
      className="shopnest-focus fixed right-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 hover:-translate-y-0.5 hover:bg-brand-dark sm:right-6 sm:bottom-6"
    >
      <span aria-hidden className="text-base">?</span>
      Help & Support
    </Link>
  );
}
