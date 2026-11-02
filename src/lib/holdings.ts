import {
  ALCHEMY_BASE_URL,
  ALCHEMY_ETH_URL,
  NFT_CONTRACT_ADDRESS_BASE,
  NFT_CONTRACT_ADDRESS_ETH,
} from './constants';
import { HEADLINER_PASS_CONTRACT_BASE, computeHolderTier, fillMissingAttributes, HolderTierResult, SassyLike } from './holderTier';
import { createServerClient } from './supabase';

type AlchemyOwned = {
  ownedNfts: { id?: { tokenId?: string }; metadata?: { attributes?: { trait_type: string; value: string }[] } }[];
  pageKey?: string;
};

async function ownedTokens(baseUrl: string, apiKey: string, owner: string, contract: string): Promise<(SassyLike & { tokenId?: string })[]> {
  const out: (SassyLike & { tokenId?: string })[] = [];
  let pageKey: string | undefined;
  do {
    const url = `${baseUrl}/${apiKey}/getNFTsForOwner?owner=${owner}&contractAddresses[]=${contract}&withMetadata=true&pageSize=100${pageKey ? `&pageKey=${encodeURIComponent(pageKey)}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Alchemy ${res.status}`);
    const data: AlchemyOwned = await res.json();
    for (const nft of data.ownedNfts || []) {
      const raw = nft.id?.tokenId;
      out.push({ tokenId: raw ? BigInt(raw).toString() : undefined, attributes: nft.metadata?.attributes || [] });
    }
    pageKey = data.pageKey;
  } while (pageKey);
  return out;
}

/**
 * Holder tier across a set of wallets (Sassys on Base + Ethereum, Headliner Pass on Base).
 * Throws if the NFT lookup fails; returns General (1x) when there are no wallets.
 */
export async function getHolderTierForWallets(wallets: string[]): Promise<HolderTierResult> {
  const unique = [...new Set(wallets.map((w) => w.toLowerCase()).filter((w) => /^0x[0-9a-f]{40}$/.test(w)))];
  if (unique.length === 0) return computeHolderTier([], 0);

  const apiKey = (process.env.ALCHEMY_API_KEY || '').replace(/\\n/g, '').trim();
  if (!apiKey) throw new Error('ALCHEMY_API_KEY is not configured');

  const perWallet = await Promise.all(
    unique.map(async (w) => {
      const [base, eth, passes] = await Promise.all([
        ownedTokens(ALCHEMY_BASE_URL, apiKey, w, NFT_CONTRACT_ADDRESS_BASE),
        ownedTokens(ALCHEMY_ETH_URL, apiKey, w, NFT_CONTRACT_ADDRESS_ETH),
        ownedTokens(ALCHEMY_BASE_URL, apiKey, w, HEADLINER_PASS_CONTRACT_BASE),
      ]);
      // Sassys Alchemy returned without traits: read them from the Arweave metadata
      const sassys = await fillMissingAttributes([...base, ...eth]);
      return { sassys, passes: passes.length };
    })
  );

  return computeHolderTier(
    perWallet.flatMap((p) => p.sassys),
    perWallet.reduce((n, p) => n + p.passes, 0)
  );
}

/** Wallets linked (and verified) on a rewards account. */
export async function getLinkedWallets(userId: string): Promise<string[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('connected_credentials')
    .select('identifier')
    .eq('user_id', userId)
    .eq('credential_type', 'wallet');
  return (data || []).map((r) => r.identifier);
}
