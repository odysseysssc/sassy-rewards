// Shredding Sassy holder tiers (Value Proposition Grid, Nov 2026).
// Shared by the rewards site (GRIT multiplier on Shopify orders) and the portal
// (tier badge on the collector page) - keep the two copies identical.

export const HEADLINER_PASS_CONTRACT_BASE = '0x8fc022aa6ef2e5a9393f9249e11b89fdd73e3b29';

export const TOTAL_FUR_TYPES = 16;
export const HALF_PACK_FUR_TYPES = 8;

export type TierId = 'the48' | 'halfpack' | 'headliners' | 'holders' | 'general';

export type Tier = {
  id: TierId;
  name: string;
  multiplier: number;
  rule: string;
};

// Highest first. A holder gets the highest tier they qualify for.
export const TIERS: Tier[] = [
  { id: 'the48', name: 'The 48', multiplier: 2.5, rule: 'All 16 fur types, or any 1:1' },
  { id: 'halfpack', name: 'Half Pack', multiplier: 2, rule: '8 different fur types' },
  { id: 'headliners', name: 'Headliners', multiplier: 1.75, rule: 'Holds a Headliner Pass' },
  { id: 'holders', name: 'Holders', multiplier: 1.5, rule: 'Holds any Sassy' },
  { id: 'general', name: 'General', multiplier: 1, rule: 'Everyone' },
];

export type SassyLike = { attributes?: { trait_type: string; value: string }[] };

export type HolderTierResult = {
  tier: Tier;
  sassyCount: number;
  furTypes: number;
  hasOneOfOne: boolean;
  headlinerPasses: number;
  /** What it takes to reach the next tier up, if there is one worth showing. */
  next?: { tier: Tier; progress: string };
};

function normalizeFur(value: string): string {
  return value.replace('Gray Wolf', 'Grey Wolf').replace('Gray', 'Grey').trim();
}

export function computeHolderTier(sassys: SassyLike[], headlinerPasses = 0): HolderTierResult {
  const furs = new Set<string>();
  let hasOneOfOne = false;
  for (const s of sassys) {
    for (const a of s.attributes || []) {
      if (a.trait_type === 'Fur' && a.value) furs.add(normalizeFur(a.value));
      if (a.trait_type === '1 OF 1') hasOneOfOne = true;
    }
  }
  const furTypes = furs.size;
  const byId = (id: TierId) => TIERS.find((t) => t.id === id)!;

  let tier: Tier;
  if (furTypes >= TOTAL_FUR_TYPES || hasOneOfOne) tier = byId('the48');
  else if (furTypes >= HALF_PACK_FUR_TYPES) tier = byId('halfpack');
  else if (headlinerPasses > 0) tier = byId('headliners');
  else if (sassys.length > 0) tier = byId('holders');
  else tier = byId('general');

  let next: HolderTierResult['next'];
  if (tier.id === 'halfpack') next = { tier: byId('the48'), progress: `${furTypes}/${TOTAL_FUR_TYPES} fur types` };
  else if (tier.id !== 'the48') next = { tier: byId('halfpack'), progress: `${furTypes}/${HALF_PACK_FUR_TYPES} fur types` };

  return { tier, sassyCount: sassys.length, furTypes, hasOneOfOne, headlinerPasses, next };
}

// ---------------------------------------------------------------------------
// Trait fallback: Alchemy sometimes returns Sassys with no attributes (stale cache
// after the metadata moved to Arweave). Read those straight from the canonical
// metadata so fur counts / tiers are never understated.
// ---------------------------------------------------------------------------

export const SASSY_METADATA_BASE = 'https://arweave.net/53v4CoK0hznzGZCy34cgroJzrAlK3XnRtLpzK07ytVI';

type Attr = { trait_type: string; value: string };
const attributeCache = new Map<string, Attr[]>();

async function fetchSassyAttributes(tokenId: string): Promise<Attr[]> {
  const cached = attributeCache.get(tokenId);
  if (cached) return cached;
  const res = await fetch(`${SASSY_METADATA_BASE}/${tokenId}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`metadata ${tokenId}: ${res.status}`);
  const json = JSON.parse(await res.text());
  const attrs: Attr[] = Array.isArray(json?.attributes) ? json.attributes : [];
  attributeCache.set(tokenId, attrs);
  return attrs;
}

/** Fill in attributes for any token that came back without them (in place). */
export async function fillMissingAttributes<T extends { tokenId?: string; attributes?: Attr[] }>(tokens: T[]): Promise<T[]> {
  const missing = tokens.filter((t) => t.tokenId && (!t.attributes || t.attributes.length === 0));
  for (let i = 0; i < missing.length; i += 8) {
    await Promise.all(
      missing.slice(i, i + 8).map(async (t) => {
        try {
          t.attributes = await fetchSassyAttributes(t.tokenId as string);
        } catch (error) {
          console.error('[fillMissingAttributes]', error instanceof Error ? error.message : error);
        }
      })
    );
  }
  return tokens;
}
