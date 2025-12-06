
import React from 'react';
import { LeaderboardEntry } from '../types';
import { Trophy, Clock, Medal } from 'lucide-react';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries }) => {
  const sortedEntries = entries.sort((a,b) => b.score - a.score).slice(0, 100);

  const getRankColor = (index: number) => {
    if (index === 0) return 'text-yellow-400';
    if (index === 1) return 'text-gray-300';
    if (index === 2) return 'text-amber-600';
    return 'text-white/40';
  };

  return (
    <div className="w-full bg-rizz-card border border-white/10 rounded-xl p-6 shadow-2xl relative z-10 flex flex-col h-full max-h-[800px]">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3 text-rizz-gold">
          <div className="p-2 bg-rizz-gold/10 rounded-lg">
            <Trophy size={24} />
          </div>
          <div>
            <h2 className="font-arcade text-xl tracking-wider text-white">Hall of Fame</h2>
            <p className="text-[10px] text-rizz-gold font-mono">TOP 100 PLAYERS • SEASON 1</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-white/30 bg-black/20 px-3 py-1 rounded-full">
          <Clock size={12} /> Resets weekly
        </div>
      </div>

      <div className="overflow-y-auto pr-2 flex-1 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
          {sortedEntries.map((entry, index) => (
            <div 
              key={entry.id} 
              className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 group
                ${index < 3 ? 'bg-white/5 border-white/10' : 'hover:bg-white/5 border-transparent hover:border-white/5'}
              `}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className={`font-arcade text-xs w-8 text-right ${getRankColor(index)}`}>
                  #{index + 1}
                </span>
                
                <div className="relative">
                  <img 
                    src={entry.avatarUrl} 
                    alt={entry.name} 
                    className={`w-8 h-8 rounded object-cover bg-slate-800 ${index < 3 ? 'ring-2 ring-offset-1 ring-offset-transparent ring-white/20' : ''}`}
                  />
                  {index < 3 && (
                     <div className="absolute -top-1 -right-1 text-yellow-400 drop-shadow-md">
                        <Medal size={12} fill="currentColor" />
                     </div>
                  )}
                </div>
                
                <span className={`font-bold text-xs truncate max-w-[100px] ${index < 3 ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                  {entry.name}
                </span>
              </div>
              
              <span className={`font-arcade text-xs tracking-wider ${index < 3 ? 'text-rizz-green' : 'text-gray-500'}`}>
                {entry.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-[10px] text-white/30 font-mono uppercase">
        <span>Rank</span>
        <span>Player</span>
        <span>Score</span>
      </div>
    </div>
  );
};
