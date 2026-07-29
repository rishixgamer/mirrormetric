import type { ReactNode } from "react";
import { RouteLink } from "../router";

export function SiteHeader() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <RouteLink className="brand" to="/" aria-label="MirrorMetric home">
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          <span>MirrorMetric</span>
          <span className="beta-badge">Beta</span>
        </RouteLink>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <RouteLink to="/analyze">Analyze</RouteLink>
          <RouteLink to="/methodology">Methodology</RouteLink>
          <RouteLink to="/history">Local history</RouteLink>
          <RouteLink to="/open-source">Open source</RouteLink>
        </nav>
        <RouteLink className="button button-small button-dark" to="/analyze">
          Start a scan
        </RouteLink>
        <details className="mobile-nav">
          <summary aria-label="Open navigation">Menu</summary>
          <nav aria-label="Mobile navigation">
            <RouteLink to="/analyze">Analyze</RouteLink>
            <RouteLink to="/methodology">Methodology</RouteLink>
            <RouteLink to="/history">Local history</RouteLink>
            <RouteLink to="/open-source">Open source</RouteLink>
          </nav>
        </details>
      </header>
    </>
  );
}

export function PageShell({
  children,
  announcement,
}: {
  readonly children: ReactNode;
  readonly announcement: string;
}) {
  return (
    <>
      <SiteHeader />
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <RouteLink className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            M
          </span>
          MirrorMetric
        </RouteLink>
        <p>
          Private facial geometry for adults. Research software—not medical
          advice or an objective measure of beauty.
        </p>
      </div>
      <nav aria-label="Footer navigation">
        <RouteLink to="/privacy">Privacy</RouteLink>
        <RouteLink to="/terms">Terms</RouteLink>
        <RouteLink to="/methodology">Accuracy</RouteLink>
        <RouteLink to="/open-source">Source</RouteLink>
      </nav>
    </footer>
  );
}
