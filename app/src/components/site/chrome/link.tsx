// An anchor that navigates client-side for internal hrefs (including search and
// hash, e.g. "/shop?c=coffee" or "/#pour") and opens external links in a new tab.
// Plain <a href> under the hood, so it works before hydration and with every
// modifier-click the browser offers.
import { useRouter } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, MouseEvent, Ref } from "react";

import { isExternalHref } from "./shared";

interface ChromeLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  /** Force external behaviour (new tab). Defaults to detecting it from the href. */
  external?: boolean;
  ref?: Ref<HTMLAnchorElement>;
}

export function ChromeLink({ href, external, onClick, children, ref, ...rest }: ChromeLinkProps) {
  const router = useRouter();
  const isMail = href.startsWith("mailto:") || href.startsWith("tel:");
  const isExternal = !isMail && (external ?? isExternalHref(href));

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || isExternal || isMail) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    void router.navigate({ href });
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      ref={ref}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...rest}
    >
      {children}
      {isExternal ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}
