
import React, { useState } from 'react';
import { GameStatus, GameMode } from '../types';

interface UIOverlayProps {
  status: GameStatus;
  score: number;
  highScore: number;
  level: number;
  timeLeft: number; 
  comboCount: number;
  isComboMode: boolean;
  hasShield: boolean;
  gameOverReason: string;
  onStart: (mode: GameMode) => void;
  onRevive: () => void;
  onRestart: () => void;
  onBuyShield: () => void;
  onOpenModeSelect: () => void;
}

type LeaderboardTab = 'national' | 'local' | 'friends';

export const UIOverlay: React.FC<UIOverlayProps> = ({
  status,
  score,
  highScore,
  gameOverReason,
  onStart,
  onRevive,
  onRestart,
  onBuyShield,
  onOpenModeSelect
}) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lbTab, setLbTab] = useState<LeaderboardTab>('national');
  const [lbMode, setLbMode] = useState<GameMode>(GameMode.CRAZY);

  const LeaderboardModal = () => (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-blue-500 animate-in zoom-in-95 duration-200">
        <div className="bg-blue-500 p-6 text-white relative">
          <button 
            onClick={() => setShowLeaderboard(false)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-black/10 rounded-full text-2xl font-bold hover:bg-black/20"
          >
            ×
          </button>
          <h2 className="text-2xl font-black text-center italic tracking-widest">🏆 拼图大神榜 🏆</h2>
          
          {/* Mode Selector */}
          <div className="flex bg-blue-700/40 p-1 rounded-2xl mt-4 mb-2">
            <button 
              onClick={() => setLbMode(GameMode.REGULAR)}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${lbMode === GameMode.REGULAR ? 'bg-white text-blue-600 shadow-inner' : 'text-blue-100'}`}
            >
              常规模式
            </button>
            <button 
              onClick={() => setLbMode(GameMode.CRAZY)}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${lbMode === GameMode.CRAZY ? 'bg-orange-500 text-white shadow-md scale-105' : 'text-blue-100'}`}
            >
              疯狂模式 🔥
            </button>
          </div>

          <div className="flex justify-around mt-2 bg-blue-600/50 p-1 rounded-full">
            {(['national', 'local', 'friends'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setLbTab(tab)}
                className={`flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all ${lbTab === tab ? 'bg-white text-blue-600 shadow-md' : 'text-white'}`}
              >
                {tab === 'national' ? '全国' : tab === 'local' ? '本地' : '好友'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 max-h-[45vh]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rank) => (
            <div key={rank} className="flex items-center gap-3 p-3 mb-2 bg-white rounded-2xl shadow-sm border-b-2 border-gray-200">
              <div className={`w-8 h-8 flex items-center justify-center font-black rounded-full ${
                rank === 1 ? 'bg-yellow-400 text-yellow-800' :
                rank === 2 ? 'bg-gray-300 text-gray-700' :
                rank === 3 ? 'bg-orange-300 text-orange-800' :
                'bg-blue-50 text-blue-400'
              }`}>
                {rank <= 3 ? ['🥇', '🥈', '🥉'][rank-1] : rank}
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl overflow-hidden border-2 border-white shadow-sm">
                {['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'][rank-1]}
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-700">玩家_{Math.random().toString(36).substr(2, 5)}</div>
                <div className="text-[9px] text-gray-400 font-bold uppercase">{lbMode === GameMode.CRAZY ? 'Crazy' : 'Regular'}</div>
              </div>
              <div className="text-right">
                <div className="font-black text-blue-600">{lbMode === GameMode.CRAZY ? (15500 - (rank * 1200)) : (8000 - (rank * 600))}</div>
                <div className="text-[10px] text-gray-400 uppercase font-bold">PTS</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* User's Score Section */}
        <div className="bg-blue-600 p-4 border-t-4 border-blue-400 shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
           <div className="flex items-center gap-4 bg-white/20 p-3 rounded-2xl border border-white/30 text-white">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl shadow-inner">
                 👤
              </div>
              <div className="flex-1">
                 <div className="text-[10px] font-bold opacity-80 uppercase tracking-widest">My Best ({lbMode === GameMode.CRAZY ? 'Crazy' : 'Regular'})</div>
                 <div className="text-lg font-black italic">Rank #42</div>
              </div>
              <div className="text-right">
                 <div className="text-2xl font-black text-yellow-300 drop-shadow-sm">{Math.floor(highScore)}</div>
                 <div className="text-[10px] font-bold opacity-80 uppercase">Score</div>
              </div>
           </div>
        </div>

        <div className="p-4 bg-white text-center">
          <button 
            onClick={() => setShowLeaderboard(false)}
            className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black shadow-lg active:translate-y-1 active:shadow-none transition-all"
          >
            返回游戏
          </button>
        </div>
      </div>
    </div>
  );

  if (status === GameStatus.MODE_SELECT) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-50 p-6 text-center">
        <button 
          onClick={() => setShowLeaderboard(true)}
          className="absolute top-6 right-6 w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center text-3xl border-2 border-blue-50 active:scale-90 transition-transform pointer-events-auto"
        >
          🏆
        </button>

        <div className="mb-12">
            <h1 className="text-5xl font-black text-blue-600 italic tracking-tighter transform -rotate-2">
                PUZZLE<br/><span className="text-blue-400">VERIFY</span>
            </h1>
            <div className="mt-2 h-1 w-32 bg-blue-100 mx-auto rounded-full"></div>
        </div>

        <div className="flex flex-col gap-6 w-full max-w-xs pointer-events-auto">
          <button 
            onClick={() => onStart(GameMode.REGULAR)}
            className="group relative w-full py-6 bg-green-500 rounded-[2rem] shadow-[0_12px_0_rgb(22,163,74)] active:shadow-[0_4px_0_rgb(22,163,74)] active:translate-y-2 transition-all overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
            <span className="text-2xl font-black text-white italic drop-shadow-md">常规模式</span>
            <p className="text-green-100 text-xs font-bold mt-1">放松心情 · 锻炼手感</p>
          </button>

          <button 
            onClick={() => onStart(GameMode.CRAZY)}
            className="group relative w-full py-8 bg-orange-500 rounded-[2.5rem] shadow-[0_12px_0_rgb(194,65,12)] active:shadow-[0_4px_0_rgb(194,65,12)] active:translate-y-2 transition-all overflow-hidden border-4 border-white/20 animate-pulse-slow"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
            <span className="text-3xl font-black text-white italic drop-shadow-md">疯狂模式</span>
            <p className="text-orange-100 text-sm font-bold mt-1">挑战极限 · 瞬间反应</p>
            <div className="absolute -right-4 -top-4 text-4xl opacity-20 transform rotate-12">🔥</div>
          </button>
        </div>

        <p className="mt-12 text-gray-400 font-bold text-xs tracking-widest uppercase">Version 2.5 - Stable</p>
        
        {showLeaderboard && <LeaderboardModal />}

        <style>{`
            @keyframes pulse-slow {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
            .animate-pulse-slow {
                animation: pulse-slow 2s infinite ease-in-out;
            }
        `}</style>
      </div>
    );
  }

  if (status === GameStatus.MENU) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 z-50 p-6 text-center">
        <h1 className="text-4xl font-extrabold text-blue-600 mb-2 drop-shadow-md">PUZZLE VERIFY</h1>
        <p className="text-gray-500 mb-4">准备好了吗？</p>
        
        <div className="bg-blue-50 px-6 py-2 rounded-lg mb-8 border border-blue-100">
           <p className="text-blue-500 font-bold uppercase text-xs tracking-wider">High Score</p>
           <p className="text-3xl font-black text-blue-700">{Math.floor(highScore)}</p>
        </div>

        <button 
          onClick={() => onStart(GameMode.CRAZY)}
          className="w-56 py-4 bg-blue-500 text-white rounded-full text-xl font-bold shadow-xl hover:bg-blue-600 transform transition active:scale-95 mb-4"
        >
          GO!
        </button>

        <button 
          onClick={onOpenModeSelect}
          className="text-blue-400 font-bold text-sm underline mt-4 active:opacity-50"
        >
          返回模式选择
        </button>
      </div>
    );
  }

  if (status === GameStatus.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-50 p-6 text-center animate-fade-in">
        <div className="text-8xl mb-4 animate-pulse">😭</div>
        
        <h2 className="text-4xl font-black text-red-500 mb-2 tracking-tighter italic">FAIL!</h2>
        <p className="text-white mb-8 text-lg opacity-80">{gameOverReason}</p>
        
        <div className="text-6xl font-black text-white mb-2">
          {Math.floor(score)}
        </div>
        <p className="text-gray-400 mb-8 text-sm">Best: {Math.floor(highScore)}</p>

        <button 
          onClick={onRevive}
          className="w-64 py-4 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full text-xl font-bold shadow-lg mb-4 hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
        >
           <span>📺</span> Revive & Continue
        </button>

        <button 
          onClick={onRestart}
          className="w-64 py-3 bg-gray-700 text-white rounded-full text-lg font-bold shadow-lg hover:bg-gray-600 active:scale-95"
        >
          Restart
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between overflow-hidden">
      {/* Feedback area moved to App header */}
    </div>
  );
};
