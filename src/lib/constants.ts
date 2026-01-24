export const NFT_CONTRACT_ADDRESS_BASE = '0x227f81f5f697cdd9554a43bbab01d7a85b9466c1';
export const NFT_CONTRACT_ADDRESS_ETH = '0x3118d9776af8953ab252ba1b1f7a1d5f24101127';
export const SHAKA_CONTRACT_ADDRESS = '0x478e03D45716dDa94F6DbC15A633B0D90c237E2F' as const;
export const PURGATORY_WALLET = '0x565336703d10178b375338e8026e820aee2daea5';
export const CHAIN_ID = 8453; // Base
export const ALCHEMY_BASE_URL = 'https://base-mainnet.g.alchemy.com/nft/v2';
export const ALCHEMY_ETH_URL = 'https://eth-mainnet.g.alchemy.com/nft/v2';

export const RAFFLE_COST = 10; // Grit cost per pinwheel entry
export const SWAP_COST = 10; // Grit cost per purgatory swap request
export const TOTAL_COLLECTION_TRAITS = 140; // Total unique traits (excluding 1 of 1s)

// All trait values by category (from manifest.json)
export const ALL_TRAITS: Record<string, string[]> = {
  Fur: [
    'Beige', 'Black', 'Blue', 'Brown', 'Crash Test', 'Dark Brown',
    'Frost', 'Grey Wolf', 'Pine', 'Pink', 'Purple', 'Snow Leopard',
    'Tibetan Fox', 'White', 'Wolverine', 'X-Ray'
  ],
  Background: [
    'Blue', 'Brown', 'Green', 'Grey', 'Mint', 'Mountains', 'Pink', 'Red', 'Snow White', 'Yellow'
  ],
  Eyes: [
    'Angry', 'Bloodshot', 'Closed', 'Glowing', 'Heterochromia', 'Hypnotized',
    'Okay', 'Sad', 'Sarcastic', 'Sassy', 'Squinted', 'Stoked', 'Tired', 'Wide Eyed'
  ],
  Mouth: [
    'Biting Lip', 'Grimace', 'Grin', 'Handlebar Moustache', 'Headphones', 'Hungry',
    'Ice Axe', 'Laugh', 'Maple Syrup', 'Okay', 'Pout', 'Rage', 'Sad', 'Sassy',
    'Shocked', 'Side Grin', 'Smile', 'Snowball', 'Stoked', 'Tongue Out', 'Toothpick', 'Walkie Talkie'
  ],
  Clothes: [
    'Avalanche Airbag', 'Aztec Jacket', 'Back Protector', 'Backcountry Jacket', 'Black Hoodie',
    'Black Tee', 'Casual Shirt', 'Flannel Shirt', 'Gilet', 'Harness', 'Hawaiian Shirt',
    'Hoodie And Jacket', 'Insulated Jacket', 'Instructor', 'Mountain Patrol', 'Mountain Ropes',
    'Open Zip Hoodie', 'Park Jacket', 'Park Rat Hoodie', 'Park Rat Tee', 'Parka Jacket',
    'Patterned Sweater', 'Puffer Jacket', 'Retro Jacket', 'Retro Onesie', 'Salopettes',
    'Sand Tee', 'Ski Race Suit', 'Sleeveless Shirt', 'Spring Jacket', 'Tee With Backpack',
    'Tie Dye Tee', 'Turtleneck', 'Utility Vest', 'White Tee', 'Winter Camo', 'Winter Scarf', 'Wool Sweater'
  ],
  Eyewear: [
    'AR Glasses', 'Barrel Sunglasses', 'Blindfold', 'Circle Sunglasses', 'Clear Glasses',
    'Eyepatch', 'Full Tint Goggles', 'Half Tint Goggles', 'Heart Glasses', 'Nouns Glasses',
    'Reflective Goggles', 'Sports Sunglasses', 'VR Headset', 'Vintage Goggles', 'Wayfarer Sunglasses'
  ],
  Hat: [
    'Action Cam', 'Airpods', 'Backwards Black Cap', 'Backwards Green Cap', 'Bandana',
    'Beer Can', 'Black Beanie', 'Blue Cap', 'Chullo', 'Cowboy Hat', 'Crown', 'Dreads',
    'Ear Warmers', 'Earrings', 'Grey Beanie And Goggles', 'Halo', 'Helmet', 'Olive Beanie',
    'Pink Beanie And Goggles', 'Rabbit Fur Hat', 'Rasta Tam', 'Red  Beanie', 'Spinner Cap',
    'Top Knot', 'White Cap'
  ]
};

// Pin Wheel pins - 19 total, equal probability
export const PINS = [
  { name: 'Beer Can', image: '/images/Beer can.png' },
  { name: 'Base Logo', image: '/images/base logo.png' },
  { name: 'Bitcoin Logo', image: '/images/bitcoin logo.png' },
  { name: 'Diamond Hands', image: '/images/diamond hands.png' },
  { name: 'Double Peaks', image: '/images/double peaks.png' },
  { name: 'ETH Logo', image: '/images/eth logo.png' },
  { name: 'Fire', image: '/images/fire.png' },
  { name: 'Flaming Goggles', image: '/images/flaming goggles.png' },
  { name: 'Ghost', image: '/images/ghost.png' },
  { name: 'Glitch Smiley', image: '/images/glitch smiley.png' },
  { name: 'MTB Sassy', image: '/images/mtb sassy.png' },
  { name: 'Pixel Glasses', image: '/images/pixel glasses.png' },
  { name: 'Sassy Drip Logo', image: '/images/sassy drip logo.png' },
  { name: 'Skateboard', image: '/images/skateboard.png' },
  { name: 'Ski Sassy', image: '/images/ski sassy.png' },
  { name: 'Snowboard Sassy', image: '/images/snowboard sassy.png' },
  { name: 'SSSC', image: '/images/sssc.png' },
  { name: 'Stache', image: '/images/stache.png' },
  { name: 'Surf Sassy', image: '/images/surf sassy.png' },
] as const;

export const NAV_LINKS = [
  { href: '/', label: 'Collector Dashboard' },
  { href: '/purgatory', label: 'Purgatory' },
  { href: '/bridge', label: 'Bridge' },
] as const;

export const EXTERNAL_LINKS = {
  rewards: 'https://rewards.shreddingsassy.com',
  discord: 'https://discord.gg/sassy',
  twitter: 'https://x.com/shreddingsassy',
  mainSite: 'https://shreddingsassy.com',
} as const;

export const PRIZE_TIERS = {
  COMMON: { weight: 60, label: 'Common Pin', color: '#9CA3AF' },
  UNCOMMON: { weight: 30, label: 'Uncommon Pin', color: '#34D399' },
  RARE: { weight: 10, label: 'Rare Pin', color: '#FACC15' },
} as const;

// LayerZero V1 Chain IDs
export const LZ_CHAIN_IDS = {
  ethereum: 101,
  base: 184,
} as const;

// ONFT Bridge ABI (only required functions)
export const ONFT_BRIDGE_ABI = [
  {
    name: 'estimateSendFee',
    inputs: [
      { name: '_dstChainId', type: 'uint16' },
      { name: '_toAddress', type: 'bytes' },
      { name: '_tokenId', type: 'uint256' },
      { name: '_useZro', type: 'bool' },
      { name: '_adapterParams', type: 'bytes' },
    ],
    outputs: [
      { name: 'nativeFee', type: 'uint256' },
      { name: 'zroFee', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'estimateSendBatchFee',
    inputs: [
      { name: '_dstChainId', type: 'uint16' },
      { name: '_toAddress', type: 'bytes' },
      { name: '_tokenIds', type: 'uint256[]' },
      { name: '_useZro', type: 'bool' },
      { name: '_adapterParams', type: 'bytes' },
    ],
    outputs: [
      { name: 'nativeFee', type: 'uint256' },
      { name: 'zroFee', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'sendFrom',
    inputs: [
      { name: '_from', type: 'address' },
      { name: '_dstChainId', type: 'uint16' },
      { name: '_toAddress', type: 'bytes' },
      { name: '_tokenId', type: 'uint256' },
      { name: '_refundAddress', type: 'address' },
      { name: '_zroPaymentAddress', type: 'address' },
      { name: '_adapterParams', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    name: 'sendBatchFrom',
    inputs: [
      { name: '_from', type: 'address' },
      { name: '_dstChainId', type: 'uint16' },
      { name: '_toAddress', type: 'bytes' },
      { name: '_tokenIds', type: 'uint256[]' },
      { name: '_refundAddress', type: 'address' },
      { name: '_zroPaymentAddress', type: 'address' },
      { name: '_adapterParams', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    name: 'trustedRemoteLookup',
    inputs: [{ name: '', type: 'uint16' }],
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'minDstGasLookup',
    inputs: [
      { name: '_dstChainId', type: 'uint16' },
      { name: '_packetType', type: 'uint16' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
