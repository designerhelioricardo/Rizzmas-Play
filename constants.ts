
import { LeaderboardEntry } from './types';

// ---------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------

// Wallet to receive game fees/donations
export const TREASURY_WALLET_ADDRESS = "8eFbDerwkWohA5YcRWYRJxPqMdt1fnbu27rxqWYkTADz";

export const TOKEN_NAME = "Rizzmas";
export const TOKEN_TICKER = "$RIZZMAS";
export const TOKEN_IMAGE_URL = "https://picsum.photos/200/200?random=99";

// Credit System Configuration
// Assuming 1 SOL approx $150-200 USD for safe estimation or fixed low amounts for devnet
// $0.10 USD ~= 0.0005 SOL
// $1.00 USD ~= 0.005 SOL

export const CREDIT_COST_PER_GAME = 1; // 1 Credit = $0.01

export const CREDIT_PACKS = [
  {
    id: 'STARTER',
    name: 'POCKET CHANGE',
    credits: 10,     // 10 Plays
    priceUsd: 0.10,
    priceSol: 0.0005, 
    icon: '🪙'
  },
  {
    id: 'BALLER',
    name: 'HIGH ROLLER',
    credits: 100,    // 100 Plays
    priceUsd: 1.00,
    priceSol: 0.005,
    icon: '💰'
  }
];

// Generate Top 100 Mock Data
const generateMockData = (): LeaderboardEntry[] => {
  const entries: LeaderboardEntry[] = [
    { id: '1', name: 'Satoshi', score: 12500, avatarUrl: 'https://picsum.photos/85/85?random=1', timestamp: Date.now(), gameType: 'RUNNER' },
    { id: '2', name: 'ElfX', score: 9800, avatarUrl: 'https://picsum.photos/85/85?random=2', timestamp: Date.now(), gameType: 'SHOOTER' },
    { id: '3', name: 'Hodler', score: 8400, avatarUrl: 'https://picsum.photos/85/85?random=3', timestamp: Date.now(), gameType: 'CATCHER' },
  ];

  const NAMES = ["RizzLord", "SnowChad", "PumpFun", "SolDegen", "MoonSanta", "GrinchWifHat", "PaperHands", "DiamondHands", "WAGMI_Elf", "RudolphRed"];
  
  for (let i = 4; i <= 100; i++) {
    entries.push({
      id: i.toString(),
      name: `${NAMES[Math.floor(Math.random() * NAMES.length)]}${Math.floor(Math.random() * 999)}`,
      score: Math.floor(Math.random() * 8000) + 500,
      avatarUrl: `https://picsum.photos/85/85?random=${i}`,
      timestamp: Date.now(),
      gameType: 'RUNNER'
    });
  }
  return entries;
};

export const MOCK_LEADERBOARD_DATA: LeaderboardEntry[] = generateMockData();
