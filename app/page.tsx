import type { Metadata } from "next";
import { PageView } from "@/components/site/PageView";
import { getPublishedContent } from "@/lib/content/store";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPublishedContent();
  const page = content.pages[0];
  return { title: content.settings.siteName, description: page.description };
}

export default async function Home() {
  const content = await getPublishedContent();
  return <PageView content={content} pageIndex={0} />;
}
