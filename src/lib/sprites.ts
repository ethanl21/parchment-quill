import type { SearchResult, SearchResultKind } from "stardew-valley-data";

// Pinned to the installed stardew-valley-data version, bump it with the package.
const SPRITE_CDN = "https://cdn.jsdelivr.net/npm/stardew-valley-data@1.0.1";

export interface ParsedItemId {
  type: string;
  id: string;
}

// Qualified game id like "(O)24" -> type "O", id "24".
const QUALIFIED = /^\(([^)]+)\)(.+)$/;

export function parseItemId(raw?: string): ParsedItemId | null {
  const m = QUALIFIED.exec((raw ?? "").trim());
  if (!m) return null;
  return { type: m[1].toUpperCase(), id: m[2] };
}

// Game object-type items spread across dataset kinds; equipment maps 1:1.
const OBJECT_KINDS: SearchResultKind[] = [
  "crop",
  "crop-seed",
  "fruit-tree-produce",
  "wild-tree-seed",
  "wild-tree-tapper",
  "animal-produce",
  "artisan-good",
  "monster-loot",
  "forageable",
  "fish",
  "bait",
  "tackle",
  "cooked-dish",
  "artifact",
  "mineral",
  "mineral-resource",
  "geode",
];

const KINDS_BY_TYPE: Record<string, SearchResultKind[]> = {
  O: OBJECT_KINDS,
  B: ["footwear"],
  H: ["hat"],
  W: ["weapon"],
  T: ["tool"],
  R: ["ring"],
};

export function spriteUrl(image: string): string {
  // Some dataset paths already start with "images/"; strip that prefix so the
  // CDN path below doesn't double up.
  return `${SPRITE_CDN}/images/${image.replace(/^images\//, "")}`;
}

type SearchFn = (query: string, kinds?: SearchResultKind[]) => SearchResult[];

let searchPromise: Promise<SearchFn> | null = null;

function loadSearch(): Promise<SearchFn> {
  if (!searchPromise) {
    // Lazy chunk (~1MB dataset). Only fetched when a sprite actually renders.
    searchPromise = import("stardew-valley-data").then((m) => m.search);
  }
  return searchPromise;
}

const cache = new Map<string, string | null>();

async function lookup(itemId: string): Promise<string | null> {
  const parsed = parseItemId(itemId);
  if (!parsed) return null;
  const kinds = KINDS_BY_TYPE[parsed.type];
  if (!kinds) return null;
  try {
    const search = await loadSearch();
    // search() also returns fuzzy hits; keep only the exact id with an image.
    const hit = search(parsed.id, kinds).find((r) => r.id === parsed.id && r.image);
    return hit ? spriteUrl(hit.image) : null;
  } catch {
    // dataset chunk failed to load, the caller keeps its placeholder
    return null;
  }
}

export function resolveItemSprite(itemId: string): Promise<string | null> {
  const cached = cache.get(itemId);
  if (cached !== undefined) return Promise.resolve(cached);
  return lookup(itemId).then((url) => {
    cache.set(itemId, url);
    return url;
  });
}
