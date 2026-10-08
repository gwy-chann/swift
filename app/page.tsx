import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND } from "@/lib/tokens";
import { LogIn, ArrowRight } from "lucide-react";

export default function Home() {
  const tokenChips = [
    { label: "Primary (Steel Blue)", bg: "bg-primary", text: "text-white" },
    { label: "Secondary (Slate)", bg: "bg-secondary", text: "text-white" },
    { label: "Accent / Warning", bg: "bg-accent", text: "text-white" },
    { label: "Success (Stock/OK)", bg: "bg-success", text: "text-white" },
    { label: "Info / OEM Sky", bg: "bg-info", text: "text-white" },
    { label: "Danger / Alert", bg: "bg-danger", text: "text-white" },
  ];

  return (
    <main suppressHydrationWarning className="min-h-screen bg-bg-base flex flex-col justify-between p-6 md:p-12">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-white font-extrabold text-xl shadow-sm tracking-wider">
            S
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              {BRAND.name}
            </h1>
            <p className="text-xs text-text-muted">{BRAND.tagline}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login Hub</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Showcase */}
      <section className="max-w-6xl w-full mx-auto my-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Portal Access Cards */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Point-of-Sale & Shop Management
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mt-1">
              SWIFT Management Portals
            </h2>
            <p className="text-sm text-text-secondary mt-2 max-w-xl">
              Clean Slate and Balanced Steel Blue theme inspired by automotive workshop precision and high-contrast floor readability.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Admin Portal Card */}
            <Link
              href="/login"
              className="bg-bg-surface border border-border rounded-lg p-6 shadow-sm hover:border-primary transition-all group block"
            >
              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mb-4">
                ADM
              </div>
              <h3 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">
                Admin Management Portal
              </h3>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Full analytics, warehouse rack & shelf locator, inventory adjustments, POS cashier, MotoMatcher, and profit margins.
              </p>
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs font-medium text-primary">
                <span>Access Management Hub</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Staff Portal Card */}
            <Link
              href="/login"
              className="bg-bg-surface border border-border rounded-lg p-6 shadow-sm hover:border-primary transition-all group block"
            >
              <div className="w-8 h-8 rounded bg-emerald-500/10 text-success flex items-center justify-center font-bold text-sm mb-4">
                POS
              </div>
              <h3 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">
                Staff Shop Floor & POS
              </h3>
              <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                Fast-lane POS checkout, shelf locator, barcode price checker, and employee shift punch clock.
              </p>
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs font-medium text-success">
                <span>Open Staff Terminal</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>

          {/* Tokens Live Palette */}
          <div className="bg-bg-surface border border-border rounded-lg p-6 shadow-sm">
            <h4 className="text-sm font-semibold text-text-primary mb-3">
              Brand Color System Tokens
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {tokenChips.map((chip) => (
                <div
                  key={chip.label}
                  className="p-3 rounded-md border border-border bg-bg-card flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-sm ${chip.bg} shadow-xs`} />
                    <span className="text-xs font-medium text-text-primary">
                      {chip.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    CSS & Tailwind Token
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Tokens Spec Sheet */}
        <aside className="bg-bg-surface border border-border rounded-lg p-6 shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
              Design Token Specs
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Aligned with <code className="font-mono text-primary">mockup/style.css</code>
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Default Theme</span>
                <span className="font-semibold text-text-primary">Light Mode</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Dark Mode</span>
                <span className="font-semibold text-text-primary">Supported (.dark)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Typography</span>
                <span className="font-semibold text-text-primary font-mono text-[11px]">Inter / SFMono</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Base Background</span>
                <span className="font-semibold text-text-primary font-mono text-[11px]">var(--bg-base)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Card Surface</span>
                <span className="font-semibold text-text-primary font-mono text-[11px]">var(--bg-surface)</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-text-muted">Primary Blue</span>
                <span className="font-semibold text-text-primary font-mono text-[11px]">#2563eb / #3b82f6</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-md bg-bg-muted border border-border text-xs text-text-secondary leading-relaxed">
            💡 Use tokens in Tailwind via classes like <code className="font-mono text-primary">bg-primary</code>, <code className="font-mono text-primary">bg-surface</code>, <code className="font-mono text-primary">text-text-primary</code>, or in TypeScript via <code className="font-mono text-primary">@/lib/tokens</code>.
          </div>
        </aside>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-2">
        <span>© {new Date().getFullYear()} SWIFT. All rights reserved.</span>
        <span>Default: Light Mode • Clean Slate & Balanced Steel Blue</span>
      </footer>
    </main>
  );
}
