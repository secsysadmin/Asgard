// Anchor ids shared by the renderer and the search index, so search results
// can link straight to a specific item.

/** Anchor for one FAQ question. */
export const faqItemId = (blockId: string, group: number, item: number) => `${blockId}-q${group + 1}-${item + 1}`;
