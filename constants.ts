
import { LeaderboardEntry } from './types';

// ---------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------

// Replace this with YOUR Wallet Public Key to receive game fees.
// DO NOT put a private key here.
export const TREASURY_WALLET_ADDRESS = "RizzmasTreasuryWalletAddressPlaceHolder123";

// Cost per game in SOL (Approx $0.10 USD)
export const GAME_COST_SOL = 0.0005; 

export const TOKEN_NAME = "Rizzmas";
export const TOKEN_TICKER = "$RIZZMAS";

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

export const TOKEN_IMAGE_URL = "https://picsum.photos/200/200?random=99";
