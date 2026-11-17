import { createContext, Fragment, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Static labels for known path segments. */
const STATIC_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/tenders': 'Tenders',
  '/tenders/new': 'New Tender',
  '/tenders/upload': 'Bulk Upload',
  '/calendar': 'Key Dates',
  '/profile': 'My Profile',
};

const APP_TITLE = 'Tender Tracker';

type LabelMap = Record<string, string>;

const BreadcrumbContext = createContext<{
  labels: LabelMap;
  setLabel: (path: string, label: string | null) => void;
} | null>(null);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<LabelMap>({});
  const setLabel = useCallback((path: string, label: string | null) => {
    setLabels((prev) => {
      if (label === null) {
        if (!(path in prev)) return prev;
        const { [path]: _removed, ...rest } = prev;
        return rest;
      }
      return prev[path] === label ? prev : { ...prev, [path]: label };
    });
  }, []);
  const value = useMemo(() => ({ labels, setLabel }), [labels, setLabel]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

/**
 * Give a dynamic route a friendly breadcrumb label, e.g. a tender's reference
 * instead of its UUID. Call from the page that owns the route.
 */
export function useBreadcrumbLabel(path: string | undefined, label: string | null | undefined) {
  const ctx = useContext(BreadcrumbContext);
  const setLabel = ctx?.setLabel;
  useEffect(() => {
    if (!setLabel || !path || !label) return;
    setLabel(path, label);
    return () => setLabel(path, null);
  }, [setLabel, path, label]);
}

interface Crumb {
  href: string;
  label: string;
}

function humanise(segment: string) {
  const decoded = decodeURIComponent(segment);
  // UUIDs and long ids are not useful to people.
  if (/^[0-9a-f-]{20,}$/i.test(decoded)) return 'Details';
  return decoded.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildCrumbs(pathname: string, labels: LabelMap): Crumb[] {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const crumbs: Crumb[] = [{ href: '/', label: STATIC_LABELS['/'] }];
  if (clean === '/') return crumbs;

  const segments = clean.split('/').filter(Boolean);
  let href = '';
  for (const seg of segments) {
    href += `/${seg}`;
    crumbs.push({ href, label: labels[href] ?? STATIC_LABELS[href] ?? humanise(seg) });
  }
  return crumbs;
}

/** Route-aware breadcrumb trail. Also keeps the browser tab title in sync. */
export function AppBreadcrumbs() {
  const { pathname } = useLocation();
  const ctx = useContext(BreadcrumbContext);
  const crumbs = buildCrumbs(pathname, ctx?.labels ?? {});
  const currentLabel = crumbs[crumbs.length - 1]?.label;

  useEffect(() => {
    document.title = currentLabel ? `${currentLabel} | ${APP_TITLE}` : APP_TITLE;
  }, [currentLabel]);

  // Collapse the middle of long trails into an ellipsis menu.
  const collapse = crumbs.length > 4;
  const visible = collapse ? [crumbs[0], ...crumbs.slice(-2)] : crumbs;
  const hidden = collapse ? crumbs.slice(1, -2) : [];

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {visible.map((crumb, i) => {
          const isLast = i === visible.length - 1;
          const isHome = crumb.href === '/';
          const content = isHome ? (
            <span className="flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5" />
              <span className={isLast ? '' : 'sr-only sm:not-sr-only'}>{crumb.label}</span>
            </span>
          ) : (
            <span className="max-w-[16rem] truncate">{crumb.label}</span>
          );

          return (
            <Fragment key={crumb.href}>
              {i > 0 && <BreadcrumbSeparator />}
              {i === 1 && hidden.length > 0 && (
                <>
                  <BreadcrumbItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center" aria-label="Show more">
                        <BreadcrumbEllipsis className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {hidden.map((h) => (
                          <DropdownMenuItem key={h.href} asChild>
                            <Link to={h.href}>{h.label}</Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{content}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href}>{content}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
