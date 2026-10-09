import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

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

function buildHead(meta: AppMeta) {
  const title = meta.og_title ?? DEFAULT_TITLE;
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
  head: () => buildHead(appMeta),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const first = useRef(true);

  useEffect(() => initSmoothScroll(), []);

  useEffect(() => {
    const { ScrollTrigger } = ensureGsap();
    ui.setMenu(false);
    cart.close();
    lockScroll(false);
    if (pathname !== "/") document.documentElement.dataset.story = "paper";
    if (!first.current) {
      if (hash) {
        const target = document.getElementById(hash);
        if (target) getLenis()?.scrollTo(target, { immediate: true });
      } else {
        getLenis()?.scrollTo(0, { immediate: true });
        window.scrollTo(0, 0);
      }
    }
    first.current = false;
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => window.clearTimeout(id);
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
