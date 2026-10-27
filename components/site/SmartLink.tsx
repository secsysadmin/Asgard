"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; children: ReactNode };

export const isExternalHref = (href: string) => /^https?:/i.test(href);

function isOtherPageOnSite(href: string, pathname: string) {
  const path = href.split("#")[0];
  return href.startsWith("/") && !!path && path !== pathname;
}

export function SmartLink({ href, children, ...rest }: Props) {
  const pathname = usePathname();
  if (isExternalHref(href))
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  if (!isOtherPageOnSite(href, pathname))
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
