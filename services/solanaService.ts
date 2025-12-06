
import { PhantomProvider, WindowWithSolana } from '../types';
import { TREASURY_WALLET_ADDRESS } from '../constants';
import * as web3 from '@solana/web3.js';

// Setup connection to Devnet for this demo.
// Change to 'mainnet-beta' for production.
const NETWORK = 'devnet';
const connection = new web3.Connection(web3.clusterApiUrl(NETWORK));

export const getProvider = (): PhantomProvider | undefined => {
  if ('solana' in window) {
    const provider = (window as WindowWithSolana).solana;
    if (provider?.isPhantom) {
      return provider;
    }
  }
  return undefined;
};

export const connectWallet = async (): Promise<string | null> => {
  const provider = getProvider();
  if (!provider) {
    // Fallback: If no wallet, we can return null or handle UI
    return null;
  }
  
  try {
    const resp = await provider.connect();
    return resp.publicKey.toString();
  } catch (err) {
    console.error("User rejected connection", err);
    return null;
  }
};

export const processPayment = async (userPublicKey: string, amountSol: number): Promise<boolean> => {
  const provider = getProvider();
  if (!provider) return false;

  try {
    console.log(`Initiating transaction for ${amountSol} SOL...`);
    const transaction = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: new web3.PublicKey(userPublicKey),
        toPubkey: new web3.PublicKey(TREASURY_WALLET_ADDRESS),
        lamports: Math.floor(amountSol * web3.LAMPORTS_PER_SOL),
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new web3.PublicKey(userPublicKey);

    // Request signature from user
    const { signature } = await provider.signAndSendTransaction(transaction);
    
    console.log("Transaction sent:", signature);
    
    // In a production app, we would await connection.confirmTransaction(signature);
    // For UI responsiveness in this demo, we assume success if signature is generated.
    return true; 
  } catch (err) {
    console.error("Transaction failed", err);
    return false;
  }
};
