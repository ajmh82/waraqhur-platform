import Link from "next/link";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link href="/" className="app-header__brand">
          <span className="app-header__brand-mark">W</span>
          <span>Waraqhur</span>
        </Link>

        <nav className="app-header__nav" aria-label="Primary">
          <Link href="/">Home</Link>
          <Link href="/timeline">Timeline</Link>
        </nav>
      </div>
    </header>
  );
}
