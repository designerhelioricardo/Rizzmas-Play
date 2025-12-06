
export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  avatarUrl: string;
  timestamp: number;
  gameType: string;
}

export enum GameType {
  RUNNER = 'RUNNER',
  SHOOTER = 'SHOOTER',
  CATCHER = 'CATCHER',
  BOUNCE = 'BOUNCE'
}

export enum GameState {
  IDLE = 'IDLE', // Main Menu / Game Selector
  PAYMENT = 'PAYMENT',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  SUBMIT_SCORE = 'SUBMIT_SCORE'
}

export interface PhantomProvider {
  isPhantom: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (transaction: any) => Promise<{ signature: string }>;
  publicKey: { toString: () => string } | null;
}

export type WindowWithSolana = Window & {
  solana?: PhantomProvider;
};