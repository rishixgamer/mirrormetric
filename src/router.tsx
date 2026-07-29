import {
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

export function normalizePath(pathname: string): string {
  if (pathname === "/index.html") return "/";
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function navigate(path: string): void {
  if (normalizePath(window.location.pathname) === normalizePath(path)) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "auto" });
}

export function usePath(): string {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));
  useEffect(() => {
    const update = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return path;
}

interface RouteLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  readonly to: string;
  readonly children: ReactNode;
}

export function RouteLink({ to, children, onClick, ...props }: RouteLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(to);
  }

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

export function useDocumentMeta(title: string, description: string): void {
  useEffect(() => {
    document.title = `${title} — MirrorMetric`;
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    meta?.setAttribute("content", description);
  }, [title, description]);
}
