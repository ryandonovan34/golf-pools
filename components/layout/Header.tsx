import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-masters-green shadow-lg">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">⛳</span>
          <span className="text-xl font-bold text-white tracking-tight">
            Golf Pools
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/pools/new"
            className="text-sm font-medium text-masters-gold hover:text-white transition-colors"
          >
            Create Pool
          </Link>
          <Link
            href="/pools/join"
            className="text-sm font-medium text-masters-gold hover:text-white transition-colors"
          >
            Join Pool
          </Link>
        </nav>
      </div>
    </header>
  );
}
