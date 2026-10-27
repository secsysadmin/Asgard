import { blankLike, blockSpecs } from "../content/blocks";
import type { Block, SiteContent } from "../content/types";
import { getIn, type Path } from "./paths";

const BLOCK_PATH_LENGTH = 4;

export function blockTitle(block: Block) {
  const data: { [key: string]: unknown } = block.data;
  return block.nav || (typeof data.heading === "string" && data.heading) || (typeof data.title === "string" && data.title) || blockSpecs[block.type].label;
}

function isBlockListPath(listPath: Path) {
  return listPath[0] === "pages" && listPath[2] === "blocks";
}

function starterListItem(content: SiteContent, listPath: Path): unknown {
  const block = getIn(content, listPath.slice(0, BLOCK_PATH_LENGTH)) as Block;
  let node: unknown = blockSpecs[block.type].starter();
  for (const key of listPath.slice(BLOCK_PATH_LENGTH + 1)) node = Array.isArray(node) ? node[0] : getIn(node, [key]);
  return Array.isArray(node) && node.length ? blankLike(node[0]) : undefined;
}

function emptyItemForKey(key: string): unknown {
  if (key === "gallery" || key === "images") return { src: "", alt: "" };
  if (key === "links" || key === "nav") return { label: "", href: "" };
  if (key === "facts") return { label: "", value: "" };
  if (key === "people") return { name: "", role: "", phone: "" };
  if (key === "columns") return "Column";
  return "";
}

export function templateFor(content: SiteContent, listPath: Path): unknown {
  const list = getIn(content, listPath);
  if (Array.isArray(list) && list.length) return blankLike(list[0]);
  const fromStarter = isBlockListPath(listPath) ? starterListItem(content, listPath) : undefined;
  return fromStarter ?? emptyItemForKey(String(listPath[listPath.length - 1]));
}
