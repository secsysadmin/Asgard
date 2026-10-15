import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageView } from "@/components/site/PageView";
import { getPublishedContent } from "@/lib/content/store";

export const revalidate = 300;

export async function generateStaticParams() {
  const content = await getPublishedContent();
  return content.pages.filter((page) => page.slug).map((page) => ({ slug: page.slug }));
}

async function find(params: PageProps<"/[slug]">["params"]) {
  const { slug } = await params;
  const content = await getPublishedContent();
  const index = content.pages.findIndex((page) => page.slug && page.slug === slug);
  return { content, index };
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { content, index } = await find(params);
  if (index < 0) return {};
  const page = content.pages[index];
  return { title: `${page.title} | ${content.settings.siteName}`, description: page.description };
}

export default async function SitePage({ params }: PageProps<"/[slug]">) {
  const { content, index } = await find(params);
  if (index < 0) notFound();
  return <PageView content={content} pageIndex={index} />;
}
