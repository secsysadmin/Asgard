import { blankLike, blockSpecs } from "../content/blocks";
import type { Block, SiteContent } from "../content/types";
import { getIn, type Path } from "./paths";

/** The name the studio shows for a section. */
export function blockTitle(block: Block) {
  const data = block.data as Record<string, unknown>;
  return block.nav || (typeof data.heading === "string" && data.heading) || (typeof data.title === "string" && data.title) || blockSpecs[block.type].label;
}

/** A blank item for a list, shaped like its siblings or the block's starter. */
export function templateFor(content: SiteContent, listPath: Path): unknown {
  const list = getIn(content, listPath);
  if (Array.isArray(list) && list.length) return blankLike(list[0]);
  if (listPath[0] === "pages" && listPath[2] === "blocks") {
    const block = getIn(content, listPath.slice(0, 4)) as Block;
    let node: unknown = blockSpecs[block.type].starter();
    for (const key of listPath.slice(5)) node = Array.isArray(node) ? node[0] : (node as Record<string, unknown> | undefined)?.[key as string];
    if (Array.isArray(node) && node.length) return blankLike(node[0]);
  }
  const key = String(listPath[listPath.length - 1]);
  if (key === "gallery" || key === "images") return { src: "", alt: "" };
  if (key === "links" || key === "nav") return { label: "", href: "" };
  if (key === "facts") return { label: "", value: "" };
  if (key === "people") return { name: "", role: "", phone: "" };
  if (key === "columns") return "Column";
  return "";
}

