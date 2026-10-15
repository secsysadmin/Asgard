"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; children: ReactNode };

/**
 * One link component for content-driven URLs: other pages on this site use
 * client-side navigation, external sites open in a new tab, and same-page
 * anchors stay plain links so the browser fires hashchange (which opens FAQ
 * answers).
 */
export function SmartLink({ href, children, ...rest }: Props) {
  const pathname = usePathname();
  if (/^https?:/i.test(href))
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  const path = href.split("#")[0];
  if (!href.startsWith("/") || !path || path === pathname)
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
