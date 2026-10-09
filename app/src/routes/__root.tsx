import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportHiggsfieldError } from "../lib/higgsfield-error-reporting";
// Page metadata (browser <title>/favicon + social og: tags) committed into the
// repo by the marketplace meta API and read at BUILD time — no runtime fetch.
import appMetaJson from "../app-meta.json";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { NotFoundPage } from "@/components/pages/not-found";
import {
  FullscreenMenu,
  Preloader,
  SiteFooter,
  SiteHeader,
  SoundToggle,
  StoreFinderPill,
} from "@/components/site/chrome";
import { setStoryTheme } from "@/experience/story";
import { cart } from "@/lib/cart";
import { THEME_COLOR } from "@/lib/site";
import { ensureGsap, initSmoothScroll, getLenis, lockScroll } from "@/lib/motion/smooth";
import { ui } from "@/lib/ui";

declare const __HF_DESIGN_INSPECTOR__: boolean;

const DEFAULT_TITLE = "PLATŌ Coffee | Coffee sculpted. Community included.";
const DEFAULT_DESCRIPTION =
  "Follow one PLATŌ cup from the roast to the regular. Shop House Blend coffee, pods, matcha, Rocket and Eureka equipment, and Academy courses, delivered across South Africa.";

type AppMeta = {
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  favicon_url?: string | null;
  og_video_url?: string | null;
  marketplace_cover_url?: string | null;
};

const appMeta = appMetaJson as AppMeta;

const APP_HOST_ZONES = ["higgsfield.app", "higgsfield-dev.app"];

function toOwnAssetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("/")) return value;
  try {
    const u = new URL(value);
    const isAppHost = APP_HOST_ZONES.some((zone) => u.hostname === zone || u.hostname.endsWith(`.${zone}`));
    if (isAppHost) return u.pathname + u.search;
    return value;
  } catch {
    return value;
  }
}

const NOT_FOUND_TITLE = "Page not found | PLATŌ Coffee";

function buildHead(meta: AppMeta, notFound = false) {
  const title = notFound ? NOT_FOUND_TITLE : (meta.og_title ?? DEFAULT_TITLE);
  const description = meta.og_description ?? DEFAULT_DESCRIPTION;
  const ogImage = toOwnAssetUrl(meta.og_image_url);
  const favicon = toOwnAssetUrl(meta.favicon_url) ?? "/assets/brand/favicon.svg";
  const ogVideo = toOwnAssetUrl(meta.og_video_url);

  return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title },
      { name: "description", content: description },
      { name: "author", content: "PLATŌ Coffee" },
      { name: "theme-color", content: THEME_COLOR },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "PLATŌ Coffee" },
      { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { name: "twitter:image", content: ogImage },
          ]
        : []),
      ...(ogVideo ? [{ property: "og:video", content: ogVideo }] : []),
    ],
    links: [
      { rel: "preload", href: "/fonts/jost-variable.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" as const },
      { rel: "preload", href: "/fonts/instrument-serif-normal.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" as const },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: favicon, type: favicon.endsWith(".svg") ? "image/svg+xml" : undefined },
      { rel: "apple-touch-icon", href: "/assets/brand/favicon-180.png" },
    ],
  };
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportHiggsfieldError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <main id="main" className="root-error">
      <p className="t-label">Something went cold</p>
      <h1 className="t-statement">This page didn't pour.</h1>
      <p className="t-body">Something went wrong on our side. Try again, or head back to the counter.</p>
      <div className="root-error__actions">
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Try again
        </button>
        <a href="/">Back to the counter</a>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // An unknown URL (or a loader that throws notFound) gets a real "not found"
  // title in the server HTML, not the home page's.
  head: ({ match, matches }) =>
    buildHead(appMeta, Boolean(match.globalNotFound) || matches.some((m) => m.status === "notFound")),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  // Resolved, like MotionRoot: React re-writes this attribute whenever the value
  // changes, and `location` moves while the old page is still on screen (it
  // repainted the home story in paper, or /shop in roast, mid-navigation).
  const pathname = useRouterState({ select: (s) => (s.resolvedLocation ?? s.location).pathname });
  // The story opens in the dark of the roastery; every other page is the white café.
  const initialStory = pathname === "/" ? "roast" : "paper";
  return (
    <html lang="en-ZA" data-story={initialStory} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** Lenis + GSAP for the whole app, and route-change housekeeping. */
function MotionRoot() {
  // Keyed on the RESOLVED location: `location` changes as soon as a navigation
  // starts, while the old page (lazy chunks) is still mounted. Resetting the
  // scroll then would replay the old page's ScrollTriggers (f01's theme
  // trigger wrote "roast" after our "paper"). The resolved location only moves
  // once the new page has committed, and this layout effect runs before it
  // paints.
  const pathname = useRouterState({ select: (s) => (s.resolvedLocation ?? s.location).pathname });
  const hash = useRouterState({ select: (s) => (s.resolvedLocation ?? s.location).hash });
  // The location the document loaded on. StrictMode re-runs effects on mount,
  // so "first" means "still on the initial location and never navigated".
  const initialKey = useRef<string | null>(null);
  const navigated = useRef(false);
  const lastPath = useRef<string | null>(null);

  useEffect(() => initSmoothScroll(), []);

  useLayoutEffect(() => {
    const { ScrollTrigger } = ensureGsap();
    const key = `${pathname}#${hash}`;
    if (initialKey.current === null) initialKey.current = key;
    const isFirst = !navigated.current && key === initialKey.current;
    if (!isFirst) navigated.current = true;
    const isHome = pathname === "/";

    // 1. Overlays closed, scroll unlocked.
    ui.setMenu(false);
    cart.close();
    lockScroll(false);

    // 2. Scroll. A fresh load of the story always opens on f01 (the router
    //    keeps no position for "/"), except a deep link to a chapter (#pour),
    //    which the browser lands natively.
    if (isFirst) {
      if (isHome && !hash) {
        history.scrollRestoration = "manual";
        window.scrollTo(0, 0);
        getLenis()?.scrollTo(0, { immediate: true });
      }
    } else if (hash) {
      const target = document.getElementById(hash);
      if (target) {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(target, { immediate: true });
        else window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY);
      }
    } else {
      getLenis()?.scrollTo(0, { immediate: true });
      window.scrollTo(0, 0);
    }

    // 3. Theme, only after the scroll reset, so no story trigger can overwrite it.
    if (!isHome) setStoryTheme("paper");

    // 4. Client navigations: focus the new page's <main> (not on the first
    //    load, and not for anchors, which keep the browser's own focus), and
    //    announce the new title whenever the page itself changed.
    const pageChanged = lastPath.current !== null && lastPath.current !== pathname;
    lastPath.current = pathname;
    const moveFocus = !isFirst && !hash;
    let settle = 0;
    if (moveFocus || (!isFirst && pageChanged)) {
      const focusMain = () => {
        const main = document.querySelector<HTMLElement>("main#main");
        if (!main) return;
        if (!main.hasAttribute("tabindex")) main.tabIndex = -1;
        main.focus({ preventScroll: true });
      };
      if (moveFocus) focusMain();
      const announcer = document.getElementById("route-announcer");
      if (announcer) announcer.textContent = "";
      // Overlays restore focus to their trigger as they close (a passive
      // effect that runs after this one), so settle focus once more shortly
      // after, then announce the new title. A timer, not rAF, so it also
      // runs in a background tab.
      settle = window.setTimeout(() => {
        const main = document.querySelector<HTMLElement>("main#main");
        if (moveFocus && main && !main.contains(document.activeElement)) focusMain();
        if (announcer) announcer.textContent = document.title;
      }, 60);
    }

    const id = window.setTimeout(() => {
      // refresh() restores the scroll position it last cached, which can still
      // be the previous page's (no scroll event yet, e.g. a background tab):
      // keep where the page actually is.
      const y = window.scrollY;
      ScrollTrigger.refresh();
      if (Math.abs(window.scrollY - y) > 1) {
        getLenis()?.scrollTo(y, { immediate: true });
        window.scrollTo(0, y);
      }
      if (!isHome) setStoryTheme("paper");
    }, 120);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(settle);
    };
  }, [pathname, hash]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (!__HF_DESIGN_INSPECTOR__) {
      return;
    }

    void import("../module/design-inspector/runtime")
      .then(({ installHiggsfieldDesignInspector }) => {
        installHiggsfieldDesignInspector();
      })
      .catch((error) => {
        reportHiggsfieldError(error instanceof Error ? error : new Error("Failed to load design inspector"), {
          boundary: "higgsfield_design_inspector_import",
        });
      });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionRoot />
      {/* Client navigations write the new page title here (MotionRoot). */}
      <p aria-live="polite" aria-atomic="true" className="sr-only" id="route-announcer" />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Preloader />
      <SiteHeader />
      <FullscreenMenu />
      <CartDrawer />
      {/* Required: nested routes render here. Each page renders its own <main id="main">. */}
      <Outlet />
      <SiteFooter />
      <SoundToggle />
      <StoreFinderPill />
    </QueryClientProvider>
  );
}
