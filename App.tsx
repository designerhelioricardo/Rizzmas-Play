
import React, { useState, useEffect } from 'react';
import { GameState, LeaderboardEntry, GameType } from './types';
import { connectWallet, getProvider, processPayment } from './services/solanaService';
import { audioService } from './services/audioService';
import { GameRunner } from './components/GameRunner';
import { GameShooter } from './components/GameShooter';
import { GameCatcher } from './components/GameCatcher';
import { GameBounce } from './components/GameBounce';
import { Button } from './components/Button';
import { Leaderboard } from './components/Leaderboard';
import { MOCK_LEADERBOARD_DATA, TOKEN_NAME, TOKEN_TICKER, CREDIT_PACKS, CREDIT_COST_PER_GAME } from './constants';
import { Wallet, Coins, Snowflake, Upload, Gamepad2, ArrowLeft, RotateCcw, Trophy, TrendingUp, Users, Rocket, Gift, ExternalLink, Heart, ShoppingCart, X, Volume2, VolumeX } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [selectedGameType, setSelectedGameType] = useState<GameType>(GameType.RUNNER);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD_DATA);
  
  // Audio State
  const [isMuted, setIsMuted] = useState(audioService.getMuteState());
  
  // Credit System
  const [credits, setCredits] = useState(0); // 1 Credit = $0.01 (1 Game)
  const [showStore, setShowStore] = useState(false);
  
  // Submission Form State
  const [playerName, setPlayerName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(`https://picsum.photos/85/85?random=${Math.floor(Math.random()*1000)}`);

  useEffect(() => {
    const provider = getProvider();
    if (provider?.publicKey) {
      setWalletAddress(provider.publicKey.toString());
    }
  }, []);

  // Manage Background Music based on Game State
  useEffect(() => {
    // Only play menu music if user has interacted (ctx exists) or if not muted
    if (gameState === GameState.IDLE && !isMuted) {
       audioService.playBGM('MENU');
    } else if (gameState !== GameState.PLAYING) {
       audioService.stopBGM();
    }
  }, [gameState, isMuted]);

  const handleInteraction = () => {
    audioService.init();
    if (gameState === GameState.IDLE && !isMuted) {
      audioService.playBGM('MENU');
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = audioService.toggleMute();
    setIsMuted(muted);
  };

  const handleConnect = async () => {
    handleInteraction();
    const address = await connectWallet();
    if (address) {
      setWalletAddress(address);
    } else {
      setWalletAddress("TEST_WALLET_MODE_ACTIVE");
    }
  };

  const handleSelectGame = (type: GameType) => {
    handleInteraction();
    setSelectedGameType(type);
    
    if (credits >= CREDIT_COST_PER_GAME) {
      setCredits(prev => prev - CREDIT_COST_PER_GAME);
      setGameState(GameState.PLAYING);
    } else {
      setShowStore(true);
    }
  };

  const handleBuyCredits = async (packId: string) => {
    handleInteraction();
    const pack = CREDIT_PACKS.find(p => p.id === packId);
    if (!pack) return;
    
    if (!walletAddress) {
      handleConnect();
      return;
    }

    setIsLoading(true);

    let success = false;
    
    if (walletAddress === "TEST_WALLET_MODE_ACTIVE") {
       await new Promise(r => setTimeout(r, 1000));
       success = true;
    } else {
       success = await processPayment(walletAddress, pack.priceSol);
    }

    if (success) {
      setCredits(prev => prev + pack.credits);
      setShowStore(false);
      audioService.playSFX('coin');
    } else {
      alert("Transaction cancelled or failed.");
    }
    
    setIsLoading(false);
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    audioService.playSFX('gameover');
    setTimeout(() => {
        setGameState(GameState.GAME_OVER);
    }, 500);
  };

  const handleExitGame = () => {
    setGameState(GameState.IDLE);
    setScore(0);
  };

  const handleRetry = () => {
    if (credits >= CREDIT_COST_PER_GAME) {
       setCredits(prev => prev - CREDIT_COST_PER_GAME);
       setScore(0);
       setGameState(GameState.PLAYING);
    } else {
       setShowStore(true);
    }
  };

  const handleGoToSubmit = () => {
    setGameState(GameState.SUBMIT_SCORE);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { 
        alert("Image too large (Max 500KB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitScore = () => {
    if (!playerName || playerName.length > 7) {
      alert("Name must be 1-7 characters");
      return;
    }

    const newEntry: LeaderboardEntry = {
      id: Date.now().toString(),
      name: playerName.toUpperCase(),
      score: score,
      avatarUrl: avatarUrl,
      timestamp: Date.now(),
      gameType: selectedGameType
    };

    setLeaderboard(prev => [newEntry, ...prev]);
    setGameState(GameState.IDLE);
    setPlayerName('');
    setAvatarUrl(`https://picsum.photos/85/85?random=${Math.floor(Math.random()*1000)}`);
  };

  // --- Render Helpers ---

  const renderStoreModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={handleInteraction}>
      <div className="bg-rizz-card border-2 border-rizz-gold rounded-xl w-full max-w-md relative shadow-[0_0_50px_rgba(255,215,0,0.2)]">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rizz-gold text-black font-arcade text-xs px-4 py-1 rounded-full border border-white/20">
           INSERT COIN
        </div>
        <button 
          onClick={() => setShowStore(false)}
          className="absolute top-2 right-2 text-white/50 hover:text-white transition"
        >
          <X size={24} />
        </button>

        <div className="p-6 md:p-8 text-center">
           <h2 className="text-2xl font-arcade text-white mb-2">NEED CREDITS?</h2>
           <p className="text-gray-400 text-xs mb-8">Each play costs $0.01 (1 Credit).</p>

           <div className="grid gap-4">
              {CREDIT_PACKS.map(pack => (
                 <button 
                    key={pack.id}
                    disabled={isLoading}
                    onClick={() => handleBuyCredits(pack.id)}
                    className="flex items-center justify-between bg-black/40 hover:bg-white/5 border border-white/10 hover:border-rizz-green p-4 rounded-lg group transition-all"
                 >
                    <div className="flex items-center gap-4">
                        <div className="text-4xl group-hover:scale-110 transition-transform">{pack.icon}</div>
                        <div className="text-left">
                            <div className="font-arcade text-rizz-gold text-sm">{pack.name}</div>
                            <div className="text-xs text-gray-400">{pack.credits} Credits</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-arcade text-white">${pack.priceUsd.toFixed(2)}</div>
                        <div className="text-[10px] text-gray-500 font-mono">~{pack.priceSol} SOL</div>
                    </div>
                 </button>
              ))}
           </div>
           
           <div className="mt-6 text-[10px] text-gray-600">
              Payments processed securely via Solana.
           </div>
        </div>
      </div>
    </div>
  );

  const renderGameSelector = () => (
    <div className="flex flex-col items-center text-center space-y-8 animate-fade-in relative z-20 w-full max-w-6xl">
      <div className="space-y-2 mb-4">
        <h1 className="text-4xl md:text-6xl font-arcade text-transparent bg-clip-text bg-gradient-to-r from-rizz-red via-white to-rizz-green drop-shadow-sm leading-tight">
          {TOKEN_NAME}
        </h1>
        <p className="text-rizz-gold font-arcade text-xs tracking-widest bg-black/40 px-4 py-1 rounded-full border border-white/10">
          CHOOSE YOUR CHALLENGE • {TOKEN_TICKER}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full px-4">
        {/* Game Card 1 */}
        <div className="bg-rizz-card border border-white/10 rounded-xl p-6 hover:border-rizz-green hover:scale-105 transition-all group cursor-pointer relative mt-4 shadow-xl flex flex-col" onClick={() => handleSelectGame(GameType.RUNNER)}>
            <div className="snow-cap"></div>
            <div className="h-24 bg-black/50 rounded-lg mb-4 flex items-center justify-center border border-white/5 group-hover:border-rizz-green/50">
               <span className="text-4xl drop-shadow-lg">🛷</span>
            </div>
            <h3 className="font-arcade text-rizz-gold mb-2 text-sm">SANTA'S RUN</h3>
            <p className="text-[10px] text-gray-400 mb-4 h-8">Jump the cringe clouds.</p>
            <div className="mt-auto">
              <Button className="w-full text-[10px]" isLoading={isLoading && selectedGameType === GameType.RUNNER}>
                 PLAY RUNNER
              </Button>
            </div>
        </div>

        {/* Game Card 2 */}
        <div className="bg-rizz-card border border-white/10 rounded-xl p-6 hover:border-rizz-green hover:scale-105 transition-all group cursor-pointer relative mt-4 shadow-xl flex flex-col" onClick={() => handleSelectGame(GameType.SHOOTER)}>
            <div className="snow-cap"></div>
            <div className="h-24 bg-black/50 rounded-lg mb-4 flex items-center justify-center border border-white/5 group-hover:border-rizz-green/50">
               <span className="text-4xl drop-shadow-lg">❄️</span>
            </div>
            <h3 className="font-arcade text-rizz-green mb-2 text-sm">FROSTY DEFENSE</h3>
            <p className="text-[10px] text-gray-400 mb-4 h-8">360° Shooter Defense.</p>
            <div className="mt-auto">
              <Button variant="secondary" className="w-full text-[10px]" isLoading={isLoading && selectedGameType === GameType.SHOOTER}>
                 PLAY SHOOTER
              </Button>
            </div>
        </div>

        {/* Game Card 3 */}
        <div className="bg-rizz-card border border-white/10 rounded-xl p-6 hover:border-rizz-green hover:scale-105 transition-all group cursor-pointer relative mt-4 shadow-xl flex flex-col" onClick={() => handleSelectGame(GameType.CATCHER)}>
            <div className="snow-cap"></div>
            <div className="h-24 bg-black/50 rounded-lg mb-4 flex items-center justify-center border border-white/5 group-hover:border-rizz-green/50">
               <span className="text-4xl drop-shadow-lg">🏏</span>
            </div>
            <h3 className="font-arcade text-rizz-red mb-2 text-sm">ELF LAUNCH</h3>
            <p className="text-[10px] text-gray-400 mb-4 h-8">Swing & Glide Distance.</p>
            <div className="mt-auto">
              <Button variant="danger" className="w-full text-[10px]" isLoading={isLoading && selectedGameType === GameType.CATCHER}>
                 PLAY LAUNCHER
              </Button>
            </div>
        </div>

         {/* Game Card 4 */}
         <div className="bg-rizz-card border border-white/10 rounded-xl p-6 hover:border-rizz-green hover:scale-105 transition-all group cursor-pointer relative mt-4 shadow-xl flex flex-col" onClick={() => handleSelectGame(GameType.BOUNCE)}>
            <div className="snow-cap"></div>
            <div className="h-24 bg-black/50 rounded-lg mb-4 flex items-center justify-center border border-white/5 group-hover:border-rizz-green/50">
               <span className="text-4xl drop-shadow-lg">🎁</span>
            </div>
            <h3 className="font-arcade text-purple-400 mb-2 text-sm">ELF BOUNCE</h3>
            <p className="text-[10px] text-gray-400 mb-4 h-8">Collect candy & combos!</p>
            <div className="mt-auto">
              <Button className="w-full text-[10px] bg-purple-600 border-purple-800 hover:bg-purple-500 text-white" isLoading={isLoading && selectedGameType === GameType.BOUNCE}>
                 PLAY BOUNCE
              </Button>
            </div>
        </div>
      </div>
      
      {!walletAddress && (
        <p className="text-xs text-white/30 cursor-pointer hover:text-white underline decoration-dashed mt-4" onClick={handleConnect}>
          Connect Wallet (Test Mode)
        </p>
      )}
    </div>
  );

  const renderGameOver = () => (
    <div className="flex flex-col items-center bg-rizz-card p-8 rounded-2xl border border-rizz-gold shadow-2xl max-w-sm w-full animate-in zoom-in duration-300 relative">
      <div className="snow-cap"></div>
      <h2 className="text-2xl font-arcade text-rizz-gold mb-4 animate-pulse">GAME OVER</h2>
      <div className="text-5xl font-arcade text-white mb-2 drop-shadow-[0_4px_0_rgba(255,0,0,1)]">{score}</div>
      <p className="text-xs text-gray-400 mb-8 font-mono">GAME: {selectedGameType === GameType.CATCHER ? 'ELF LAUNCH' : selectedGameType}</p>
      
      <div className="w-full space-y-3">
        <Button onClick={handleGoToSubmit} className="w-full flex items-center justify-center gap-2">
           <Trophy size={16}/> SAVE SCORE
        </Button>
        <Button onClick={handleRetry} variant="secondary" className="w-full flex items-center justify-center gap-2">
           <RotateCcw size={16}/> TRY AGAIN
        </Button>
        <Button onClick={handleExitGame} variant="danger" className="w-full flex items-center justify-center gap-2">
           <ArrowLeft size={16}/> BACK TO GAMES
        </Button>
      </div>
    </div>
  );

  const renderSubmitScore = () => (
    <div className="flex flex-col items-center bg-rizz-card p-8 rounded-2xl border border-rizz-gold shadow-2xl max-w-sm w-full animate-in zoom-in duration-300 relative">
      <div className="snow-cap"></div>
      <h2 className="text-xl font-arcade text-white mb-6">HALL OF FAME</h2>
      
      <div className="w-full space-y-6">
        <div>
          <label className="block text-xs text-gray-400 mb-2 font-arcade">CALLSIGN (MAX 7)</label>
          <input 
            type="text" 
            maxLength={7}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full bg-black/50 border border-white/20 rounded p-3 text-white font-arcade focus:border-rizz-green outline-none uppercase text-center text-xl tracking-widest"
            placeholder="PLAYER1"
            autoFocus
          />
        </div>

        <div className="flex items-center gap-4 bg-black/30 p-3 rounded-lg border border-white/10">
          <div className="relative group">
             <img src={avatarUrl} className="w-16 h-16 rounded object-cover border-2 border-white/20" alt="Avatar"/>
             <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded">
                <Upload size={20} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
             </label>
          </div>
          <div className="flex-1">
             <label className="block text-xs text-gray-400 mb-1 font-arcade">AVATAR</label>
             <p className="text-[10px] text-gray-500 leading-tight">Click image to upload or keep random.</p>
          </div>
        </div>

        <Button onClick={handleSubmitScore} className="w-full">
          CONFIRM ENTRY
        </Button>
        <button onClick={() => setGameState(GameState.GAME_OVER)} className="w-full text-xs text-white/40 hover:text-white mt-2">
            Cancel
        </button>
      </div>
    </div>
  );

  const renderBuybackSection = () => (
    <div className="w-full max-w-4xl mx-auto my-12 relative z-20 px-4">
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border-2 border-rizz-green rounded-xl p-6 md:p-8 relative overflow-hidden shadow-[0_0_20px_rgba(0,214,50,0.2)]">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <TrendingUp size={100} className="text-rizz-green" />
            </div>
            
            <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                <div className="flex-1 space-y-4 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-rizz-green mb-2">
                        <Rocket size={20} />
                        <h3 className="font-arcade text-sm tracking-wide">COMMUNITY POWERED</h3>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white font-arcade leading-relaxed">
                        PLAY TO <span className="text-rizz-green">PUMP</span>
                    </h2>
                    <p className="text-gray-300 text-sm leading-relaxed max-w-md">
                        Every <strong>$100 USD</strong> collected in game fees triggers a buyback of the 
                        <span className="text-rizz-gold font-bold"> $RIZZMAS</span> token.
                    </p>
                    <div className="inline-block bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-xs text-gray-400 font-mono">
                        <span className="text-rizz-red">●</span> STATUS: MANUAL (AUTOMATION SOON)
                    </div>
                </div>

                <div className="w-full md:w-1/3 bg-black/40 rounded-lg p-4 border border-white/5 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] font-arcade text-white/60">BUYBACK POOL</span>
                         <span className="text-[10px] font-arcade text-rizz-green">$45 / $100</span>
                    </div>
                    <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                        <div className="h-full bg-gradient-to-r from-rizz-green to-emerald-300 w-[45%] shadow-[0_0_10px_rgba(0,214,50,0.5)]"></div>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 text-center">Next buyback at 100%</p>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-rizz-red/20 rounded-lg text-rizz-red"><Gamepad2 size={16}/></div>
                    <div>
                        <h4 className="font-bold text-xs text-white mb-1 font-arcade">NEW GAMES</h4>
                        <p className="text-[10px] text-gray-400">Expanding the arcade with community suggested titles.</p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-rizz-gold/20 rounded-lg text-rizz-gold"><Users size={16}/></div>
                    <div>
                        <h4 className="font-bold text-xs text-white mb-1 font-arcade">GROW TOGETHER</h4>
                        <p className="text-[10px] text-gray-400">Supporters and players build the future of Rizzmas Play.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden font-sans relative flex flex-col" onClick={handleInteraction}>
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a2e35] via-[#050505] to-[#050505]"></div>
         <div className="absolute top-10 left-10 text-white/5 animate-spin-slow"><Snowflake size={100} /></div>
         <div className="absolute bottom-10 right-10 text-white/5 animate-spin-slow" style={{animationDuration: '5s'}}><Snowflake size={150} /></div>
         <div className="absolute top-1/2 left-1/4 text-white/5 animate-float"><Gift size={60} /></div>
      </div>

      {/* Header */}
      <header className="relative z-30 flex justify-between items-center p-4 md:p-6 bg-black/60 backdrop-blur-md sticky top-0 candy-border-b shadow-lg">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setGameState(GameState.IDLE)}>
          <div className="w-10 h-10 bg-gradient-to-br from-rizz-red to-red-900 rounded-lg flex items-center justify-center font-arcade font-bold text-white shadow-[0_0_15px_rgba(255,31,31,0.5)] border border-white/20 group-hover:scale-110 transition-transform">R</div>
          <span className="hidden md:inline font-bold tracking-tight text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">RIZZMAS PLAY</span>
        </div>
        <div className="flex items-center gap-4">
          
          {/* Audio Toggle */}
          <button onClick={toggleMute} className="text-gray-400 hover:text-white transition p-2">
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {/* Credit Display */}
          <div 
             className="flex items-center gap-2 bg-black/40 border border-rizz-gold/30 px-3 py-1.5 rounded-full cursor-pointer hover:bg-rizz-gold/10 transition"
             onClick={() => setShowStore(true)}
          >
             <div className="w-2 h-2 bg-rizz-gold rounded-full animate-pulse"></div>
             <span className="font-arcade text-xs text-rizz-gold">{credits} CREDITS</span>
             <div className="bg-rizz-gold text-black text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ml-1">+</div>
          </div>

          {walletAddress ? (
            <div className="flex items-center gap-2 bg-rizz-green/10 border border-rizz-green/30 px-3 py-1.5 rounded-full hover:bg-rizz-green/20 transition cursor-pointer" onClick={handleConnect}>
              <span className="text-xs font-mono text-rizz-green">
                {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
              </span>
            </div>
          ) : (
            <button onClick={handleConnect} className="flex items-center gap-2 text-sm font-bold text-white hover:text-rizz-green transition border border-white/10 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10">
              <Wallet size={16} /> Connect
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-6 md:py-12 flex flex-col items-center justify-center flex-grow">
        
        {gameState === GameState.IDLE && (
          <div className="flex flex-col items-center w-full gap-8">
            {renderGameSelector()}
            
            <div className="w-full max-w-6xl mt-8 relative border-[2px] border-dashed border-blue-400/30 rounded-3xl p-6 md:p-10 bg-[#0F172A]/30 backdrop-blur-sm min-h-[400px] flex items-center justify-center shadow-lg">
                <div className="absolute left-10 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none hidden lg:block">
                    <Gift size={250} />
                </div>
                <div className="w-full relative z-10">
                   <Leaderboard entries={leaderboard} />
                </div>
            </div>
          </div>
        )}

        {gameState === GameState.PAYMENT && (
          <div className="text-center animate-pulse flex flex-col items-center justify-center h-64">
            <h2 className="text-xl font-arcade text-rizz-gold mb-8">PROCESSING...</h2>
          </div>
        )}

        {gameState === GameState.PLAYING && (
          <div className="w-full flex flex-col items-center animate-fade-in">
             <div className="mb-4 flex justify-between w-full max-w-2xl px-4 items-end">
               <span className="font-arcade text-xs text-white/50">{selectedGameType === GameType.CATCHER ? 'LAUNCHER' : selectedGameType} MODE</span>
               <span className="font-arcade text-xs text-rizz-gold flex items-center gap-2"><Coins size={14}/> SCORE</span>
             </div>
             
             {selectedGameType === GameType.RUNNER && <GameRunner onGameOver={handleGameOver} onExit={handleExitGame} />}
             {selectedGameType === GameType.SHOOTER && <GameShooter onGameOver={handleGameOver} onExit={handleExitGame} />}
             {selectedGameType === GameType.CATCHER && <GameCatcher onGameOver={handleGameOver} onExit={handleExitGame} />}
             {selectedGameType === GameType.BOUNCE && <GameBounce onGameOver={handleGameOver} onExit={handleExitGame} />}
          </div>
        )}

        {gameState === GameState.GAME_OVER && renderGameOver()}
        {gameState === GameState.SUBMIT_SCORE && renderSubmitScore()}

      </main>

      {gameState === GameState.IDLE && renderBuybackSection()}
      {showStore && renderStoreModal()}

      {/* Updated Footer */}
      <footer className="relative z-10 py-12 text-center text-xs text-gray-400 border-t border-white/10 bg-black/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center md:items-start space-y-3">
                 <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-rizz-red rounded flex items-center justify-center font-bold text-white text-[10px]">R</div>
                    <h4 className="font-arcade text-white">RIZZMAS TOKEN</h4>
                 </div>
                 <div className="text-left">
                    <p className="text-[10px] text-gray-500 font-mono mb-1">CONTRACT ADDRESS:</p>
                    <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/10 group cursor-pointer hover:bg-white/10 transition">
                         <p className="text-[10px] font-mono break-all text-white/70 select-all">
                            7tkrisk7a65J7Jzbm4dFuKSxXnJCKbmZrcwPquCppump
                         </p>
                    </div>
                 </div>
                 <a 
                    href="https://pump.fun/coin/7tkrisk7a65J7Jzbm4dFuKSxXnJCKbmZrcwPquCppump" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-2 text-[10px] font-arcade text-rizz-green hover:text-white transition mt-2"
                 >
                    VIEW ON PUMP.FUN <ExternalLink size={10} />
                 </a>
            </div>

            <div className="flex flex-col items-center space-y-3">
                 <div className="flex items-center gap-2 text-rizz-gold">
                    <Heart size={16} fill="currentColor" />
                    <h4 className="font-arcade">SANTA'S TIP JAR</h4>
                 </div>
                 <p className="text-[10px] max-w-xs mx-auto leading-relaxed text-gray-400">
                    Help keep the sleigh flying and the servers running! Spread the Christmas cheer and support future game development. 🎅✨
                 </p>
                 <div className="bg-gradient-to-r from-rizz-green/10 to-emerald-900/10 p-3 rounded-lg border border-rizz-green/30 font-mono text-[10px] break-all text-rizz-green select-all w-full max-w-xs text-center">
                    8eFbDerwkWohA5YcRWYRJxPqMdt1fnbu27rxqWYkTADz
                 </div>
            </div>

             <div className="flex flex-col items-center md:items-end justify-center space-y-2 text-white/30">
                 <p className="font-arcade text-[10px] uppercase tracking-widest">Powered by Solana</p>
                 <p className="text-[10px]">BUILT FOR RIZZMAS PLAY © 2024</p>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
