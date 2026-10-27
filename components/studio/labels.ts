import type { Page } from "@/lib/content/types";

export function pageName(page: Page) {
  return page.slug ? page.title : "Home";
}
